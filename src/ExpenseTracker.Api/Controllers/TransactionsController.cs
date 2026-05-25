using ExpenseTracker.Application.Features.Dashboard.Queries;
using ExpenseTracker.Application.Features.Transactions.Commands;
using ExpenseTracker.Application.Features.Transactions.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TransactionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(new { Id = result });
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTransactionsQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int month, [FromQuery] int year, CancellationToken cancellationToken)
    {
        if (month == 0 || year == 0)
        {
            var today = DateTime.UtcNow;
            month = today.Month;
            year = today.Year;
        }
        
        var query = new GetTransactionDashboardQuery { Month = month, Year = year };
        var result = await _mediator.Send(query, cancellationToken);
        
        return Ok(result);
    }
}
