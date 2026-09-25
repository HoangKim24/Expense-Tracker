using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Exceptions;
using ExpenseTracker.Domain.Interfaces;
using MediatR;

namespace ExpenseTracker.Application.Features.Transactions.Commands;

public class DeleteTransactionCommand : IRequest<string?>
{
    public Guid Id { get; set; }

    public DeleteTransactionCommand(Guid id)
    {
        Id = id;
    }
}

public class DeleteTransactionCommandHandler : IRequestHandler<DeleteTransactionCommand, string?>
{
    private readonly IRepository<Transaction> _transactionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTransactionCommandHandler(
        IRepository<Transaction> transactionRepository,
        IUnitOfWork unitOfWork)
    {
        _transactionRepository = transactionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<string?> Handle(DeleteTransactionCommand request, CancellationToken cancellationToken)
    {
        var transaction = await _transactionRepository.GetByIdAsync(request.Id, cancellationToken);
        if (transaction == null)
        {
            throw new NotFoundException(nameof(Transaction), request.Id);
        }

        var receiptImagePath = transaction.ReceiptImagePath;

        await _transactionRepository.DeleteAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return receiptImagePath;
    }
}
