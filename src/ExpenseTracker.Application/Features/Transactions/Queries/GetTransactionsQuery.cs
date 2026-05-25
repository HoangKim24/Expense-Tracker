using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Interfaces;
using MediatR;

namespace ExpenseTracker.Application.Features.Transactions.Queries;

public class GetTransactionsQuery : IRequest<List<TransactionDto>>
{
}

public class GetTransactionsQueryHandler : IRequestHandler<GetTransactionsQuery, List<TransactionDto>>
{
    private readonly IRepository<Transaction> _transactionRepository;

    public GetTransactionsQueryHandler(IRepository<Transaction> transactionRepository)
    {
        _transactionRepository = transactionRepository;
    }

    public async Task<List<TransactionDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        var transactions = await _transactionRepository.GetAllAsync(cancellationToken);
        
        return transactions.Select(t => new TransactionDto
        {
            Id = t.Id,
            Amount = t.Amount,
            TransactionDate = t.TransactionDate,
            Description = t.Description,
            Merchant = t.Merchant,
            Type = t.Type,
            CategoryId = t.CategoryId
        }).OrderByDescending(t => t.TransactionDate).ToList();
    }
}
