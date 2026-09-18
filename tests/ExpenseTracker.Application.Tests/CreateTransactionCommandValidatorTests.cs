using ExpenseTracker.Application.Features.Transactions.Commands;
using Xunit;

namespace ExpenseTracker.Application.Tests;

public class CreateTransactionCommandValidatorTests
{
    [Fact]
    public void Rejects_non_positive_amount()
    {
        var result = new CreateTransactionCommandValidator().Validate(new CreateTransactionCommand { Amount = 0, TransactionDate = DateTime.UtcNow, Description = "Test" });
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(CreateTransactionCommand.Amount));
    }

    [Fact]
    public void Accepts_a_valid_manual_transaction()
    {
        var result = new CreateTransactionCommandValidator().Validate(new CreateTransactionCommand { Amount = 100_000, TransactionDate = DateTime.UtcNow, Description = "Lunch" });
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Accepts_transaction_with_receipt_image_path()
    {
        var result = new CreateTransactionCommandValidator().Validate(new CreateTransactionCommand 
        { 
            Amount = 55_000, 
            TransactionDate = DateTime.UtcNow, 
            Description = "Coffee",
            ReceiptImagePath = "/uploads/receipt_sample.jpg"
        });
        Assert.True(result.IsValid);
    }
}
