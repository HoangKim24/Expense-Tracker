using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Domain.Entities;

public class Transaction : BaseEntity
{
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Merchant { get; set; } = string.Empty;
    
    // Updated to map with CategoryType
    public TransactionType Type { get; set; } = TransactionType.Expense; 
    
    public TransactionSource Source { get; set; } = TransactionSource.Manual;
    public string? MessageId { get; set; }
    public string? ReceiptImagePath { get; set; }
    
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
}
