using ExpenseTracker.Application.Interfaces;
using MediatR;

namespace ExpenseTracker.Application.Features.Sync.Queries;

public class GetLastSyncTimeQuery : IRequest<DateTime?>
{
}

public class GetLastSyncTimeQueryHandler : IRequestHandler<GetLastSyncTimeQuery, DateTime?>
{
    private readonly IGmailSyncService _gmailSyncService;

    public GetLastSyncTimeQueryHandler(IGmailSyncService gmailSyncService)
    {
        _gmailSyncService = gmailSyncService;
    }

    public async Task<DateTime?> Handle(GetLastSyncTimeQuery request, CancellationToken cancellationToken)
    {
        return await _gmailSyncService.GetLastSyncTimeAsync(cancellationToken);
    }
}
