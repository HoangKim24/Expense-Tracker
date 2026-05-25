using ExpenseTracker.Application.Features.Dashboard.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics([FromQuery] int month, [FromQuery] int year)
    {
        var result = await _mediator.Send(new GetDashboardMetricsQuery { Month = month, Year = year });
        return Ok(result);
    }
}
