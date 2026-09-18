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
    private readonly IRepository<Category> _categoryRepository;

    public GetTransactionsQueryHandler(
        IRepository<Transaction> transactionRepository,
        IRepository<Category> categoryRepository)
    {
        _transactionRepository = transactionRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<List<TransactionDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        var transactions = await _transactionRepository.GetAllAsync(cancellationToken);
        var categories = await _categoryRepository.GetAllAsync(cancellationToken);
        var categoryMap = categories.ToDictionary(c => c.Id);
        
        return transactions.Select(t => {
            categoryMap.TryGetValue(t.CategoryId ?? Guid.Empty, out var cat);
            return new TransactionDto
            {
                Id = t.Id,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                Description = t.Description,
                Merchant = t.Merchant,
                Type = t.Type,
                Source = t.Source,
                MessageId = t.MessageId,
                ReceiptImagePath = t.ReceiptImagePath,
                CategoryId = t.CategoryId,
                CategoryName = cat?.Name,
                CategoryColor = cat?.Color,
                CategoryIcon = cat?.Icon
            };
        }).OrderByDescending(t => t.TransactionDate).ToList();
    }
}
