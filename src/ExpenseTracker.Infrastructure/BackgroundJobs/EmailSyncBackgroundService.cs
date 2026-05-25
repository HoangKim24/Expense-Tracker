using ExpenseTracker.Application.Features.Transactions.Commands;
using ExpenseTracker.Application.Interfaces;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Domain.Interfaces;
using ExpenseTracker.Infrastructure.Services.Strategies;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace ExpenseTracker.Infrastructure.BackgroundJobs;

public class EmailSyncBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmailSyncBackgroundService> _logger;
    private readonly TimeSpan _period = TimeSpan.FromMinutes(5);

    public EmailSyncBackgroundService(IServiceProvider serviceProvider, ILogger<EmailSyncBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_period);
        
        // Cấu hình Polly: Thử lại tối đa 3 lần với Exponential Backoff (2s, 4s, 8s)
        var retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            (exception, timeSpan, retryCount, context) =>
            {
                _logger.LogWarning($"Lỗi đồng bộ Mail (Lần {retryCount}): {exception.Message}. Đang thử lại sau {timeSpan.TotalSeconds} giây...");
            });

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await retryPolicy.ExecuteAsync(async () =>
                {
                    await SyncEmailsAsync(stoppingToken);
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tiến trình đồng bộ Mail thất bại hoàn toàn sau nhiều lần thử.");
            }
        }
    }

    private async Task SyncEmailsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var gmailService = scope.ServiceProvider.GetRequiredService<IGmailService>();
        var parserFactory = scope.ServiceProvider.GetRequiredService<EmailParserFactory>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var syncLogRepo = scope.ServiceProvider.GetRequiredService<IRepository<EmailSyncLog>>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var unreadEmails = await gmailService.GetUnreadEmailsAsync(cancellationToken);

        foreach (var email in unreadEmails)
        {
            // Bước 1: Kiểm tra tính Idempotency (Trùng lặp)
            var existingLogs = await syncLogRepo.GetAsync(e => e.MessageId == email.MessageId, cancellationToken);
            
            if (existingLogs.Any())
            {
                await gmailService.MarkEmailAsReadAsync(email.MessageId, cancellationToken);
                continue;
            }

            var syncLog = new EmailSyncLog
            {
                MessageId = email.MessageId,
                ReceivedDate = email.ReceivedAt,
                Subject = email.Subject,
                BodyContent = email.Body, // Trong thực tế phase sau sẽ mã hóa AES-256 ở đây
                MerchantName = email.From,
                Status = SyncStatus.Pending
            };

            try
            {
                // Bước 2: Đưa vào EmailParserFactory
                var parser = parserFactory.GetParser(email.Subject, email.Body);
                if (parser == null)
                {
                    syncLog.Status = SyncStatus.Skipped;
                    syncLog.ErrorMessage = "Không tìm thấy Strategy phù hợp cho email này.";
                }
                else
                {
                    // Bước 3: Parse và gửi CreateTransactionCommand
                    var parsedData = parser.Parse(email.Body);
                    
                    var command = new CreateTransactionCommand
                    {
                        Amount = parsedData.Amount,
                        TransactionDate = parsedData.TransactionDate,
                        Description = parsedData.Description,
                        Type = parsedData.Type,
                        CategoryId = null, // Có thể cải tiến Map auto category dựa vào Merchant sau này
                        Source = parsedData.Source,
                        MessageId = email.MessageId
                    };

                    await mediator.Send(command, cancellationToken);
                    syncLog.Status = SyncStatus.Success;
                }
            }
            catch (Exception ex)
            {
                // Bước 4: Xử lý khi có lỗi (Thêm nhật ký Failed)
                syncLog.Status = SyncStatus.Failed;
                syncLog.ErrorMessage = ex.Message;
                syncLog.RetryCount++;
            }
            
            // Lưu log và đánh dấu đã đọc
            await syncLogRepo.AddAsync(syncLog, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await gmailService.MarkEmailAsReadAsync(email.MessageId, cancellationToken);
        }
    }
}
