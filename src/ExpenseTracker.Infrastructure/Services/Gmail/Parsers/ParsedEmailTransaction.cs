using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Infrastructure.Services.Gmail.Parsers;

public class ParsedEmailTransaction
{
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Merchant { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public TransactionSource Source { get; set; }
    public bool IsExpense { get; set; } = true;
    public string? SuggestedCategoryKeyword { get; set; }
}
