using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Domain.Entities;

public class EmailSyncLog : BaseEntity
{
    // Sử dụng MessageId làm khóa chính/Unique để kiểm tra trùng lặp (Idempotency)
    public string MessageId { get; set; } = string.Empty; 
    public DateTime ReceivedDate { get; set; }
    public string Subject { get; set; } = string.Empty;
    
    // Lưu trữ nội dung email. Được thiết kế để chứa chuỗi Base64 của dữ liệu đã mã hóa AES-256.
    public string BodyContent { get; set; } = string.Empty; 
    
    public string MerchantName { get; set; } = string.Empty;
    
    public SyncStatus Status { get; set; } = SyncStatus.Pending;
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; } = 0;
}
