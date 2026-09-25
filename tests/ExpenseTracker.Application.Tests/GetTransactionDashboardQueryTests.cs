using System.Linq.Expressions;
using ExpenseTracker.Application.Features.Dashboard.Queries;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Interfaces;
using Xunit;

namespace ExpenseTracker.Application.Tests;

public class GetTransactionDashboardQueryTests
{
    private class FakeRepository<T> : IRepository<T> where T : BaseEntity
    {
        private readonly List<T> _items;

        public FakeRepository(List<T> items)
        {
            _items = items;
        }

        public Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(_items.FirstOrDefault(x => x.Id == id));

        public Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<T>>(_items);

        public Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        {
            var compiled = predicate.Compile();
            var result = _items.Where(compiled).ToList();
            return Task.FromResult<IReadOnlyList<T>>(result);
        }

        public Task<T> AddAsync(T entity, CancellationToken cancellationToken = default) => Task.FromResult(entity);
        public Task UpdateAsync(T entity, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task DeleteAsync(T entity, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    [Fact]
    public async Task Dashboard_calculates_income_expense_and_balance_correctly()
    {
        var categoryFood = new Category { Id = Guid.NewGuid(), Name = "Ăn uống", Type = CategoryType.Expense };
        var categorySalary = new Category { Id = Guid.NewGuid(), Name = "Lương", Type = CategoryType.Income };

        var transactions = new List<Transaction>
        {
            new Transaction
            {
                Id = Guid.NewGuid(),
                Amount = 15_000_000,
                Type = TransactionType.Income,
                TransactionDate = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                CategoryId = categorySalary.Id
            },
            new Transaction
            {
                Id = Guid.NewGuid(),
                Amount = 50_000,
                Type = TransactionType.Expense,
                TransactionDate = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                CategoryId = categoryFood.Id
            },
            new Transaction
            {
                Id = Guid.NewGuid(),
                Amount = 150_000,
                Type = TransactionType.Expense,
                TransactionDate = new DateTime(2026, 9, 12, 0, 0, 0, DateTimeKind.Utc),
                CategoryId = categoryFood.Id
            }
        };

        var txRepo = new FakeRepository<Transaction>(transactions);
        var catRepo = new FakeRepository<Category>(new List<Category> { categoryFood, categorySalary });

        var handler = new GetTransactionDashboardQueryHandler(txRepo, catRepo);
        var result = await handler.Handle(new GetTransactionDashboardQuery { Month = 9, Year = 2026 }, CancellationToken.None);

        Assert.Equal(15_000_000, result.TotalIncome);
        Assert.Equal(200_000, result.TotalExpense);
        Assert.Equal(14_800_000, result.Balance);
        Assert.Single(result.CategoryBreakdown);
        Assert.Equal("Ăn uống", result.CategoryBreakdown[0].CategoryName);
        Assert.Equal(200_000, result.CategoryBreakdown[0].TotalAmount);
    }
}
