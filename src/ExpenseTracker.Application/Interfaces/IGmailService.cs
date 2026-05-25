using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Domain.Entities;

namespace ExpenseTracker.Application.Interfaces;

public interface IGmailService
{
    Task<List<EmailMessageDto>> GetUnreadEmailsAsync(CancellationToken cancellationToken = default);
    Task MarkEmailAsReadAsync(string messageId, CancellationToken cancellationToken = default);
}

public class EmailMessageDto
{
    public string MessageId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }
}
