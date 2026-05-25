using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class TechcombankEmailParser : IEmailParserStrategy
{
    public bool Match(string subject, string body)
        => EmailParsingHelper.ContainsAny(
            subject,
            body,
            "techcombank",
            "tcb",
            "f@st mobile",
            "fast mobile",
            "tcbs");

    public TransactionDto Parse(string body)
        => EmailParsingHelper.ParsePaymentEmail(
            body,
            "Techcombank",
            "Giao dich Techcombank");
}
