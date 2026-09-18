using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Exceptions;
using ExpenseTracker.Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace ExpenseTracker.Application.Features.Transactions.Commands;

public class CreateTransactionCommand : IRequest<Guid>
{
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public TransactionType Type { get; set; } = TransactionType.Expense;
    public Guid? CategoryId { get; set; }
    public TransactionSource Source { get; set; } = TransactionSource.Manual;
    public string? MessageId { get; set; }
    public string? ReceiptImagePath { get; set; }
}

public class CreateTransactionCommandValidator : AbstractValidator<CreateTransactionCommand>
{
    public CreateTransactionCommandValidator()
    {
        RuleFor(x => x.Amount)
            .GreaterThan(0);

        RuleFor(x => x.TransactionDate)
            .NotEmpty();

        RuleFor(x => x.Description)
            .MaximumLength(500);

        RuleFor(x => x.Type)
            .IsInEnum();

        RuleFor(x => x.Source)
            .IsInEnum();

        RuleFor(x => x.ReceiptImagePath)
            .MaximumLength(500);
    }
}

public class CreateTransactionCommandHandler : IRequestHandler<CreateTransactionCommand, Guid>
{
    private readonly IRepository<Transaction> _transactionRepository;
    private readonly IRepository<Category> _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateTransactionCommandHandler(
        IRepository<Transaction> transactionRepository,
        IRepository<Category> categoryRepository,
        IUnitOfWork unitOfWork)
    {
        _transactionRepository = transactionRepository;
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateTransactionCommand request, CancellationToken cancellationToken)
    {
        if (request.CategoryId.HasValue)
        {
            var category = await _categoryRepository.GetByIdAsync(request.CategoryId.Value, cancellationToken);
            if (category == null)
            {
                throw new NotFoundException(nameof(Category), request.CategoryId.Value);
            }
        }

        var transaction = new Transaction
        {
            Amount = request.Amount,
            TransactionDate = request.TransactionDate,
            Description = request.Description,
            CategoryId = request.CategoryId,
            Source = request.Source,
            MessageId = request.MessageId,
            Type = request.Type,
            ReceiptImagePath = request.ReceiptImagePath
        };

        await _transactionRepository.AddAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }
}
