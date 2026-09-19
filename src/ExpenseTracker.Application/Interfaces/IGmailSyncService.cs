using ExpenseTracker.Application.DTOs;

namespace ExpenseTracker.Application.Interfaces;

public interface IGmailSyncService
{
    Task<SyncResultDto> SyncTransactionsAsync(CancellationToken cancellationToken = default);
    Task<DateTime?> GetLastSyncTimeAsync(CancellationToken cancellationToken = default);
}
