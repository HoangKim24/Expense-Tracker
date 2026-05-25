using ExpenseTracker.Application.Interfaces;

namespace ExpenseTracker.Infrastructure.Services.Strategies;

public class EmailParserFactory
{
    private readonly IEnumerable<IEmailParserStrategy> _strategies;

    public EmailParserFactory(IEnumerable<IEmailParserStrategy> strategies)
    {
        _strategies = strategies;
    }

    public IEmailParserStrategy? GetParser(string subject, string body)
    {
        return _strategies.FirstOrDefault(s => s.Match(subject, body));
    }
}
