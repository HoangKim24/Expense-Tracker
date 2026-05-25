using ExpenseTracker.Domain.Interfaces;

namespace ExpenseTracker.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly ExpenseDbContext _dbContext;

    public UnitOfWork(ExpenseDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
