using System.Globalization;
using System.Text.RegularExpressions;
using ExpenseTracker.Domain.Enums;
using MimeKit;

namespace ExpenseTracker.Infrastructure.Services.Gmail.Parsers;

public class MoMoEmailParser
{
    private static readonly string[] PromoKeywords = new[]
    {
        "khuyến mãi", "khuyen mai", "voucher", "ưu đãi", "uu dai", 
        "quà tặng", "qua tang", "giảm giá", "giam gia", "nhận quà", 
        "quảng cáo", "quang cao", "săn deal", "chương trình"
    };

    public static ParsedEmailTransaction? Parse(MimeMessage message)
    {
        var subject = message.Subject ?? string.Empty;
        var body = message.TextBody ?? string.Empty;
        
        // Nếu không có text body, trích xuất từ HTML body bằng cách loại bỏ tags
        if (string.IsNullOrWhiteSpace(body) && !string.IsNullOrWhiteSpace(message.HtmlBody))
        {
            body = Regex.Replace(message.HtmlBody, "<[^>]+>", " ");
            body = System.Net.WebUtility.HtmlDecode(body);
        }

        var fullContent = $"{subject}\n{body}";
        var lowerContent = fullContent.ToLowerInvariant();

        // 1. Kiểm tra nếu là email khuyến mại / marketing không chứa giao dịch thực tế
        bool isPromo = PromoKeywords.Any(k => subject.ToLowerInvariant().Contains(k));
        bool isPaymentConfirmation = lowerContent.Contains("giao dịch thành công") 
                                  || lowerContent.Contains("thanh toán thành công")
                                  || lowerContent.Contains("chuyển tiền thành công")
                                  || lowerContent.Contains("hóa đơn thanh toán")
                                  || lowerContent.Contains("biến động số dư")
                                  || lowerContent.Contains("mã giao dịch")
                                  || lowerContent.Contains("mã gd");

        if (isPromo && !isPaymentConfirmation)
        {
            return null; // Bỏ qua email khuyến mãi
        }

        // 2. Bóc tách Mã giao dịch MoMo
        string? transactionId = null;
        var txIdMatch = Regex.Match(fullContent, @"(?:Mã giao dịch|Mã GD|Transaction ID|Số hóa đơn)\s*[:\-]?\s*([0-9A-Za-z]+)", RegexOptions.IgnoreCase);
        if (txIdMatch.Success)
        {
            transactionId = "MOMO_" + txIdMatch.Groups[1].Value.Trim();
        }
        else
        {
            // Dự phòng: Nếu không thấy mã giao dịch trong text, dùng Message-Id của email
            transactionId = "MOMO_MSG_" + (message.MessageId ?? Guid.NewGuid().ToString("N"));
        }

        // 3. Bóc tách Số tiền
        decimal amount = 0;
        // Thử tìm số tiền dạng: "Số tiền: 50.000đ" hoặc "Thanh toán: -50,000 VND" hoặc "-50.000 đ"
        var amountMatches = Regex.Matches(fullContent, @"(?:Số tiền|Thanh toán|Tổng tiền|Giá trị|Đã trừ)\s*[:\-]?\s*[-–]?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:đ|VND|vnđ|d)?", RegexOptions.IgnoreCase);
        foreach (Match match in amountMatches)
        {
            var raw = match.Groups[1].Value.Replace(".", "").Replace(",", "").Trim();
            if (decimal.TryParse(raw, out var parsed) && parsed > 0)
            {
                amount = parsed;
                break;
            }
        }

        if (amount == 0)
        {
            // Dự phòng regex cho số tiền âm: "- 45.000đ"
            var negativeAmountMatch = Regex.Match(fullContent, @"[-–]\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:đ|VND|vnđ)", RegexOptions.IgnoreCase);
            if (negativeAmountMatch.Success)
            {
                var raw = negativeAmountMatch.Groups[1].Value.Replace(".", "").Replace(",", "").Trim();
                decimal.TryParse(raw, out amount);
            }
        }

        // Nếu vẫn không tìm được số tiền hợp lệ, không phải email trừ tiền
        if (amount <= 0)
        {
            return null;
        }

        // 4. Bóc tách Thời gian giao dịch
        DateTime txDate = message.Date != DateTimeOffset.MinValue ? message.Date.UtcDateTime : DateTime.UtcNow;
        var dateMatch = Regex.Match(fullContent, @"(?:Thời gian|Ngày GD|Ngày thực hiện|Ngày thanh toán)\s*[:\-]?\s*([0-9]{1,2}[:/][0-9]{1,2}[:/][0-9]{2,4}(?:\s+[0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?)?)", RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            var dateStr = dateMatch.Groups[1].Value.Trim();
            var formats = new[] { "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "dd/MM/yyyy", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd" };
            if (DateTime.TryParseExact(dateStr, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
            {
                txDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            }
        }

        // 5. Bóc tách Merchant / Người nhận / Dịch vụ
        string merchant = "MoMo";
        var merchantMatch = Regex.Match(fullContent, @"(?:Dịch vụ|Nơi nhận|Người nhận|Đến|Tại|Bên nhận|Cửa hàng)\s*[:\-]?\s*([^\r\n]{2,60})", RegexOptions.IgnoreCase);
        if (merchantMatch.Success)
        {
            merchant = merchantMatch.Groups[1].Value.Trim();
        }

        // 6. Mô tả giao dịch
        string description = $"Thanh toán MoMo - {merchant}";
        var descMatch = Regex.Match(fullContent, @"(?:Nội dung|Lời nhắn|Chi tiết giao dịch)\s*[:\-]?\s*([^\r\n]{2,100})", RegexOptions.IgnoreCase);
        if (descMatch.Success)
        {
            description = descMatch.Groups[1].Value.Trim();
        }

        return new ParsedEmailTransaction
        {
            Amount = amount,
            TransactionDate = txDate,
            Description = description,
            Merchant = merchant,
            ExternalReference = transactionId,
            Source = TransactionSource.MoMo,
            IsExpense = true,
            SuggestedCategoryKeyword = $"{merchant} {description}"
        };
    }
}
