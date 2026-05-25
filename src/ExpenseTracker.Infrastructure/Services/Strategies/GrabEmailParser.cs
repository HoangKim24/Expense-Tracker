using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class GrabEmailParser : IEmailParserStrategy
{
    public bool Match(string subject, string body)
        => EmailParsingHelper.ContainsAny(
            subject,
            body,
            "grab",
            "grabfood",
            "grabmart",
            "grabcar",
            "grab bike");

    public TransactionDto Parse(string body)
        => EmailParsingHelper.ParsePaymentEmail(
            body,
            "Grab",
            "Giao dich Grab");
}
