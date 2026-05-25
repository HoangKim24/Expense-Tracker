using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

internal static class EmailParsingHelper
{
    private static readonly Regex HtmlTagRegex = new("<[^>]+>", RegexOptions.Compiled);
    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex CurrencyAfterRegex = new(
        @"(?<sign>[+-])?\s*(?<amount>\d{1,3}(?:[.,\s]\d{3})+|\d{4,})\s*(?<currency>VND|VNĐ|₫|đ)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex CurrencyBeforeRegex = new(
        @"(?<currency>VND|VNĐ|₫|đ)\s*(?<sign>[+-])?\s*(?<amount>\d{1,3}(?:[.,\s]\d{3})+|\d{4,})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex DateRegex = new(
        @"(?<day>\d{1,2})[\/\-.](?<month>\d{1,2})[\/\-.](?<year>\d{2,4})(?:\s+(?<hour>\d{1,2}):(?<minute>\d{1,2})(?::(?<second>\d{1,2}))?)?",
        RegexOptions.Compiled);

    private static readonly string[] ExpenseKeywords =
    [
        "thanh toan",
        "chi tieu",
        "mua hang",
        "rut tien",
        "chuyen tien di",
        "da tru",
        "tru tien",
        "ghi no",
        "debit",
        "payment",
        "paid",
        "purchase",
        "spent",
        "withdraw"
    ];

    private static readonly string[] IncomeKeywords =
    [
        "nhan tien",
        "chuyen tien den",
        "cong tien",
        "ghi co",
        "hoan tien",
        "nap tien",
        "credit",
        "received",
        "refund",
        "cashback",
        "deposit"
    ];

    public static string ToPlainText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var decoded = WebUtility.HtmlDecode(value);
        decoded = decoded
            .Replace("<br>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br/>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br />", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</p>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</div>", "\n", StringComparison.OrdinalIgnoreCase);

        var withoutTags = HtmlTagRegex.Replace(decoded, " ");
        return WhitespaceRegex.Replace(withoutTags, " ").Trim();
    }

    public static string NormalizeForSearch(string value)
    {
        var plainText = ToPlainText(value).ToLowerInvariant();
        var normalized = plainText.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character == 'đ' ? 'd' : character);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    public static bool ContainsAny(string subject, string body, params string[] keywords)
    {
        var searchable = NormalizeForSearch($"{subject} {body}");
        return keywords.Any(keyword => searchable.Contains(NormalizeForSearch(keyword), StringComparison.OrdinalIgnoreCase));
    }

    public static TransactionDto ParsePaymentEmail(
        string body,
        string merchant,
        string fallbackDescription,
        TransactionType? defaultType = null)
    {
        var plainText = ToPlainText(body);
        var normalized = NormalizeForSearch(plainText);
        var amount = ExtractAmount(plainText);
        var type = DetectTransactionType(normalized, plainText, defaultType);

        return new TransactionDto
        {
            Amount = amount,
            TransactionDate = ExtractDate(plainText) ?? DateTime.UtcNow,
            Description = ExtractDescription(plainText, merchant, fallbackDescription),
            Merchant = merchant,
            Type = type,
            Source = TransactionSource.Gmail
        };
    }

    private static decimal ExtractAmount(string plainText)
    {
        var matches = CurrencyAfterRegex.Matches(plainText)
            .Concat(CurrencyBeforeRegex.Matches(plainText))
            .Where(match => match.Success)
            .Select(match => new
            {
                Match = match,
                Amount = ParseAmount(match.Groups["amount"].Value),
                Score = ScoreAmountCandidate(plainText, match)
            })
            .Where(candidate => candidate.Amount > 0)
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Amount)
            .ToList();

        var bestMatch = matches.FirstOrDefault();
        if (bestMatch != null)
        {
            return bestMatch.Amount;
        }

        throw new InvalidOperationException("Khong the boc tach so tien tu email.");
    }

    private static int ScoreAmountCandidate(string plainText, Match match)
    {
        var start = Math.Max(0, match.Index - 80);
        var length = Math.Min(plainText.Length - start, match.Length + 160);
        var context = NormalizeForSearch(plainText.Substring(start, length));

        var score = 0;
        if (ExpenseKeywords.Concat(IncomeKeywords).Any(keyword => context.Contains(keyword, StringComparison.OrdinalIgnoreCase)))
        {
            score += 4;
        }

        if (context.Contains("so tien", StringComparison.OrdinalIgnoreCase)
            || context.Contains("amount", StringComparison.OrdinalIgnoreCase)
            || context.Contains("gia tri", StringComparison.OrdinalIgnoreCase)
            || context.Contains("tong", StringComparison.OrdinalIgnoreCase))
        {
            score += 3;
        }

        if (match.Groups["sign"].Value == "-" || match.Groups["sign"].Value == "+")
        {
            score += 2;
        }

        return score;
    }

    private static decimal ParseAmount(string value)
    {
        var digitsOnly = Regex.Replace(value, @"[^\d]", string.Empty);
        return decimal.TryParse(digitsOnly, NumberStyles.None, CultureInfo.InvariantCulture, out var amount)
            ? amount
            : 0;
    }

    private static TransactionType DetectTransactionType(string normalizedText, string plainText, TransactionType? defaultType)
    {
        var firstAmount = CurrencyAfterRegex.Match(plainText);
        if (!firstAmount.Success)
        {
            firstAmount = CurrencyBeforeRegex.Match(plainText);
        }

        if (firstAmount.Success)
        {
            var sign = firstAmount.Groups["sign"].Value;
            if (sign == "-")
            {
                return TransactionType.Expense;
            }

            if (sign == "+")
            {
                return TransactionType.Income;
            }
        }

        if (IncomeKeywords.Any(keyword => normalizedText.Contains(keyword, StringComparison.OrdinalIgnoreCase)))
        {
            return TransactionType.Income;
        }

        if (ExpenseKeywords.Any(keyword => normalizedText.Contains(keyword, StringComparison.OrdinalIgnoreCase)))
        {
            return TransactionType.Expense;
        }

        return defaultType ?? TransactionType.Expense;
    }

    private static DateTime? ExtractDate(string plainText)
    {
        var match = DateRegex.Match(plainText);
        if (!match.Success)
        {
            return null;
        }

        var day = int.Parse(match.Groups["day"].Value, CultureInfo.InvariantCulture);
        var month = int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture);
        var year = int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture);
        if (year < 100)
        {
            year += 2000;
        }

        var hour = match.Groups["hour"].Success ? int.Parse(match.Groups["hour"].Value, CultureInfo.InvariantCulture) : 0;
        var minute = match.Groups["minute"].Success ? int.Parse(match.Groups["minute"].Value, CultureInfo.InvariantCulture) : 0;
        var second = match.Groups["second"].Success ? int.Parse(match.Groups["second"].Value, CultureInfo.InvariantCulture) : 0;

        try
        {
            return new DateTime(year, month, day, hour, minute, second, DateTimeKind.Local).ToUniversalTime();
        }
        catch
        {
            return null;
        }
    }

    private static string ExtractDescription(string plainText, string merchant, string fallbackDescription)
    {
        var compact = WhitespaceRegex.Replace(plainText, " ").Trim();
        if (string.IsNullOrWhiteSpace(compact))
        {
            return fallbackDescription;
        }

        var firstSentence = Regex.Split(compact, @"(?<=[.!?])\s+").FirstOrDefault(text => text.Length > 10);
        var description = firstSentence ?? compact;
        description = description.Length > 160 ? description[..160] : description;

        return string.IsNullOrWhiteSpace(description)
            ? fallbackDescription
            : $"{merchant}: {description}";
    }
}
