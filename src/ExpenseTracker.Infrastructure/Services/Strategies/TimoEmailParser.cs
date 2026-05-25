using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class TimoEmailParser : IEmailParserStrategy
{
    public bool Match(string subject, string body)
        => EmailParsingHelper.ContainsAny(
            subject,
            body,
            "timo",
            "timo bank",
            "ban viet bank",
            "viet capital bank");

    public TransactionDto Parse(string body)
        => EmailParsingHelper.ParsePaymentEmail(
            body,
            "Timo",
            "Giao dich Timo");
}
