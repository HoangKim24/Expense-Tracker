using ExpenseTracker.Application.Interfaces;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ExpenseTracker.Infrastructure.Services;

public class GmailService : IGmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GmailService> _logger;

    public GmailService(IConfiguration configuration, ILogger<GmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<EmailMessageDto>> GetUnreadEmailsAsync(CancellationToken cancellationToken = default)
    {
        var emails = new List<EmailMessageDto>();
        if (!TryGetCredentials(out var username, out var appPassword))
        {
            _logger.LogWarning("Gmail sync skipped because Gmail credentials are not configured.");
            return emails;
        }

        using var client = new ImapClient();

        try
        {
            await client.ConnectAsync("imap.gmail.com", 993, true, cancellationToken);
            await client.AuthenticateAsync(username, appPassword, cancellationToken);

            var inbox = client.Inbox!;
            await inbox.OpenAsync(FolderAccess.ReadWrite, cancellationToken);

            var uids = await inbox.SearchAsync(SearchQuery.NotSeen, cancellationToken);

            foreach (var uid in uids.Take(50))
            {
                var message = await inbox.GetMessageAsync(uid, cancellationToken);
                emails.Add(new EmailMessageDto
                {
                    MessageId = message.MessageId ?? uid.Id.ToString(),
                    Subject = message.Subject ?? string.Empty,
                    From = message.From?.ToString() ?? string.Empty,
                    Body = message.TextBody ?? message.HtmlBody ?? string.Empty,
                    ReceivedAt = message.Date.UtcDateTime
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching emails from Gmail");
            throw;
        }
        finally
        {
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, cancellationToken);
            }
        }

        return emails;
    }

    public async Task MarkEmailAsReadAsync(string messageId, CancellationToken cancellationToken = default)
    {
        if (!TryGetCredentials(out var username, out var appPassword))
        {
            _logger.LogWarning("Skip marking Gmail message as read because Gmail credentials are not configured.");
            return;
        }

        using var client = new ImapClient();
        try
        {
            await client.ConnectAsync("imap.gmail.com", 993, true, cancellationToken);
            await client.AuthenticateAsync(username, appPassword, cancellationToken);

            var inbox = client.Inbox!;
            await inbox.OpenAsync(FolderAccess.ReadWrite, cancellationToken);

            var uids = await inbox.SearchAsync(SearchQuery.HeaderContains("Message-Id", messageId), cancellationToken);
            if (uids.Any())
            {
                await inbox.AddFlagsAsync(uids.First(), MessageFlags.Seen, true, cancellationToken);
            }
        }
        finally
        {
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, cancellationToken);
            }
        }
    }

    private bool TryGetCredentials(out string username, out string appPassword)
    {
        username = _configuration["Gmail:Username"] ?? string.Empty;
        appPassword = _configuration["Gmail:AppPassword"] ?? string.Empty;

        return !string.IsNullOrWhiteSpace(username)
            && !string.IsNullOrWhiteSpace(appPassword)
            && !username.StartsWith("your_", StringComparison.OrdinalIgnoreCase)
            && !appPassword.StartsWith("your_", StringComparison.OrdinalIgnoreCase);
    }
}
