using ExpenseTracker.Application.Features.Sync.Commands;
using ExpenseTracker.Application.Features.Sync.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly IMediator _mediator;

    public SyncController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("gmail")]
    public async Task<IActionResult> SyncGmail(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new SyncGmailTransactionsCommand(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("gmail/last-sync")]
    public async Task<IActionResult> GetLastSync(CancellationToken cancellationToken)
    {
        var lastSync = await _mediator.Send(new GetLastSyncTimeQuery(), cancellationToken);
        return Ok(new { lastSyncTime = lastSync });
    }
}
