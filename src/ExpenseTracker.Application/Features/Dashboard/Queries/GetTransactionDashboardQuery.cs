using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Interfaces;
using MediatR;

namespace ExpenseTracker.Application.Features.Dashboard.Queries;

public class GetTransactionDashboardQuery : IRequest<DashboardMetricsDto>
{
    public int Month { get; set; }
    public int Year { get; set; }
}

public class GetTransactionDashboardQueryHandler : IRequestHandler<GetTransactionDashboardQuery, DashboardMetricsDto>
{
    private readonly IRepository<Transaction> _transactionRepo;

    public GetTransactionDashboardQueryHandler(IRepository<Transaction> transactionRepo)
    {
        _transactionRepo = transactionRepo;
    }

    public async Task<DashboardMetricsDto> Handle(GetTransactionDashboardQuery request, CancellationToken cancellationToken)
    {
        var startDate = DateTime.SpecifyKind(new DateTime(request.Year, request.Month, 1, 0, 0, 0), DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);

        // Sử dụng AsNoTracking để tối ưu hiệu năng đọc (đã được bọc ngầm trong GetAsync của Repository implementation)
        var transactions = await _transactionRepo.GetAsync(
            t => t.TransactionDate >= startDate && t.TransactionDate < endDate,
            cancellationToken);

        var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var balance = totalIncome - totalExpense;

        var expenseCategories = transactions
            .Where(t => t.Type == TransactionType.Expense)
            .GroupBy(t => t.Category?.Name ?? "Khác")
            .Select(g => new CategoryBreakdownDto
            {
                CategoryName = g.Key,
                TotalAmount = g.Sum(t => t.Amount),
                Percentage = totalExpense > 0 ? (double)(g.Sum(t => t.Amount) / totalExpense) * 100 : 0
            })
            .OrderByDescending(c => c.TotalAmount)
            .ToList();

        return new DashboardMetricsDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            Balance = balance,
            CategoryBreakdown = expenseCategories
        };
    }
}
