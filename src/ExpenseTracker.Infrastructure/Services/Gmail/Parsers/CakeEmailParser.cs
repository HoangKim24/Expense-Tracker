using System.Globalization;
using System.Text.RegularExpressions;
using ExpenseTracker.Domain.Enums;
using MimeKit;

namespace ExpenseTracker.Infrastructure.Services.Gmail.Parsers;

public class CakeEmailParser
{
    private static readonly string[] PromoKeywords = new[]
    {
        "khuyến mãi", "khuyen mai", "voucher", "ưu đãi", "uu dai", 
        "quà tặng", "qua tang", "giảm giá", "săn deal", "chúc mừng",
        "mở thẻ", "tiết kiệm", "tích lũy"
    };

    public static ParsedEmailTransaction? Parse(MimeMessage message)
    {
        var subject = message.Subject ?? string.Empty;
        var body = message.TextBody ?? string.Empty;
        
        if (string.IsNullOrWhiteSpace(body) && !string.IsNullOrWhiteSpace(message.HtmlBody))
        {
            body = Regex.Replace(message.HtmlBody, "<[^>]+>", " ");
            body = System.Net.WebUtility.HtmlDecode(body);
        }

        var fullContent = $"{subject}\n{body}";
        var lowerContent = fullContent.ToLowerInvariant();

        // 1. Kiểm tra nếu là email khuyến mại hoặc nhận tiền/lãi (chỉ ghi nhận chi tiêu)
        bool isPromo = PromoKeywords.Any(k => subject.ToLowerInvariant().Contains(k));
        bool isBalanceFluctuation = lowerContent.Contains("biến động số dư")
                                 || lowerContent.Contains("giao dịch thành công")
                                 || lowerContent.Contains("chuyển tiền")
                                 || lowerContent.Contains("thanh toán")
                                 || lowerContent.Contains("số tham chiếu");

        if (isPromo && !isBalanceFluctuation)
        {
            return null;
        }

        // 2. Bóc tách Mã giao dịch / Số tham chiếu FT của Cake/VPBank
        string? transactionId = null;
        var txIdMatch = Regex.Match(fullContent, @"(?:Số tham chiếu|Mã tham chiếu|Mã giao dịch|Mã GD|Trace No|Ref No)\s*[:\-]?\s*([0-9A-Za-z]+)", RegexOptions.IgnoreCase);
        if (txIdMatch.Success)
        {
            transactionId = "CAKE_" + txIdMatch.Groups[1].Value.Trim();
        }
        else
        {
            // Tìm chuỗi mã dạng FT...
            var ftMatch = Regex.Match(fullContent, @"\b(FT[0-9]{8,20})\b", RegexOptions.IgnoreCase);
            if (ftMatch.Success)
            {
                transactionId = "CAKE_" + ftMatch.Groups[1].Value.Trim();
            }
            else
            {
                transactionId = "CAKE_MSG_" + (message.MessageId ?? Guid.NewGuid().ToString("N"));
            }
        }

        // 3. Bóc tách Số tiền (ưu tiên số tiền có dấu trừ hoặc biến động giảm)
        decimal amount = 0;
        var amountMatches = Regex.Matches(fullContent, @"(?:Số tiền|Biến động|Thanh toán|Số tiền GD)\s*[:\-]?\s*[-–]?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|đ|vnđ)?", RegexOptions.IgnoreCase);
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
            // Kiểm tra mẫu dấu trừ "- 50.000 VND"
            var negativeMatch = Regex.Match(fullContent, @"[-–]\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|đ|vnđ)", RegexOptions.IgnoreCase);
            if (negativeMatch.Success)
            {
                var raw = negativeMatch.Groups[1].Value.Replace(".", "").Replace(",", "").Trim();
                decimal.TryParse(raw, out amount);
            }
        }

        if (amount <= 0)
        {
            return null;
        }

        // 4. Bóc tách Thời gian
        DateTime txDate = message.Date != DateTimeOffset.MinValue ? message.Date.UtcDateTime : DateTime.UtcNow;
        var dateMatch = Regex.Match(fullContent, @"(?:Thời gian|Ngày GD|Ngày thực hiện)\s*[:\-]?\s*([0-9]{1,2}[:/][0-9]{1,2}[:/][0-9]{2,4}(?:\s+[0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?)?)", RegexOptions.IgnoreCase);
        if (dateMatch.Success)
        {
            var dateStr = dateMatch.Groups[1].Value.Trim();
            var formats = new[] { "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "dd/MM/yyyy", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd" };
            if (DateTime.TryParseExact(dateStr, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
            {
                txDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            }
        }

        // 5. Bóc tách Merchant hoặc Người nhận / Ngân hàng thụ hưởng
        string merchant = "Cake by VPBank";
        var benMatch = Regex.Match(fullContent, @"(?:Đến|Người nhận|Tài khoản nhận|Tại|Bên nhận)\s*[:\-]?\s*([^\r\n]{2,60})", RegexOptions.IgnoreCase);
        if (benMatch.Success)
        {
            merchant = benMatch.Groups[1].Value.Trim();
        }

        // 6. Nội dung chi tiết
        string description = $"Thanh toán Cake - {merchant}";
        var descMatch = Regex.Match(fullContent, @"(?:Nội dung|Nội dung GD|Chi tiết|Lời nhắn)\s*[:\-]?\s*([^\r\n]{2,100})", RegexOptions.IgnoreCase);
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
            Source = TransactionSource.Cake,
            IsExpense = true,
            SuggestedCategoryKeyword = $"{merchant} {description}"
        };
    }
}
