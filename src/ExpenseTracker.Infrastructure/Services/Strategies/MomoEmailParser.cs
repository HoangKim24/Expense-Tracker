using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class MomoEmailParser : IEmailParserStrategy
{
    public bool Match(string subject, string body)
        => EmailParsingHelper.ContainsAny(
            subject,
            body,
            "momo",
            "vi momo",
            "vi dien tu momo",
            "m_service");

    public TransactionDto Parse(string body)
        => EmailParsingHelper.ParsePaymentEmail(
            body,
            "MoMo",
            "Giao dich MoMo");
}
