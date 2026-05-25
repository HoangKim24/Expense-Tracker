using ExpenseTracker.Application.DTOs;

namespace ExpenseTracker.Application.Interfaces;

public interface IEmailParserStrategy
{
    bool Match(string subject, string body);
    TransactionDto Parse(string body);
}
