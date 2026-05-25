using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class CakeEmailParser : IEmailParserStrategy
{
    public bool Match(string subject, string body)
        => EmailParsingHelper.ContainsAny(
            subject,
            body,
            "cake",
            "cake by vpbank",
            "cake digital bank",
            "vpbank");

    public TransactionDto Parse(string body)
        => EmailParsingHelper.ParsePaymentEmail(
            body,
            "Cake",
            "Giao dich Cake");
}
