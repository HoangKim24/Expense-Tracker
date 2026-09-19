namespace ExpenseTracker.Application.DTOs;

public class SyncResultDto
{
    public bool Success { get; set; } = true;
    public int SyncedCount { get; set; }
    public int SkippedCount { get; set; }
    public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
    public string Message { get; set; } = string.Empty;
    public List<TransactionDto> NewTransactions { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}
