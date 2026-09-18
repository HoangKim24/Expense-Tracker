using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Application.DTOs;

public class TransactionDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Merchant { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public TransactionSource Source { get; set; }
    public string? MessageId { get; set; }
    public string? ReceiptImagePath { get; set; }
    
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryColor { get; set; }
    public string? CategoryIcon { get; set; }
}
