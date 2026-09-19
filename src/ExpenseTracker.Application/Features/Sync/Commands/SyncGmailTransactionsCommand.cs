using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;
using MediatR;

namespace ExpenseTracker.Application.Features.Sync.Commands;

public class SyncGmailTransactionsCommand : IRequest<SyncResultDto>
{
}

public class SyncGmailTransactionsCommandHandler : IRequestHandler<SyncGmailTransactionsCommand, SyncResultDto>
{
    private readonly IGmailSyncService _gmailSyncService;

    public SyncGmailTransactionsCommandHandler(IGmailSyncService gmailSyncService)
    {
        _gmailSyncService = gmailSyncService;
    }

    public async Task<SyncResultDto> Handle(SyncGmailTransactionsCommand request, CancellationToken cancellationToken)
    {
        return await _gmailSyncService.SyncTransactionsAsync(cancellationToken);
    }
}
