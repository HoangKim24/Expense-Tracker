using ExpenseTracker.Application.DTOs;
using MediatR;

namespace ExpenseTracker.Application.Features.Dashboard.Queries;

public class GetDashboardMetricsQuery : IRequest<DashboardMetricsDto>
{
    public int Month { get; set; }
    public int Year { get; set; }
}

public class GetDashboardMetricsQueryHandler : IRequestHandler<GetDashboardMetricsQuery, DashboardMetricsDto>
{
    private readonly IMediator _mediator;

    public GetDashboardMetricsQueryHandler(IMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task<DashboardMetricsDto> Handle(GetDashboardMetricsQuery request, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow;
        var month = request.Month == 0 ? today.Month : request.Month;
        var year = request.Year == 0 ? today.Year : request.Year;

        return await _mediator.Send(new GetTransactionDashboardQuery
        {
            Month = month,
            Year = year
        }, cancellationToken);
    }
}
