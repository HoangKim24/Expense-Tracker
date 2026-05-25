using ExpenseTracker.Application.Features.Dashboard.Queries;
using ExpenseTracker.Application.Features.Transactions.Commands;
using ExpenseTracker.Domain.Enums;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.RegularExpressions;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace ExpenseTracker.Infrastructure.BackgroundJobs;

public class TelegramBotBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramBotBackgroundService> _logger;
    private readonly TelegramBotClient _botClient;
    private readonly long _authorizedUserId;

    public TelegramBotBackgroundService(
        IServiceProvider serviceProvider, 
        IConfiguration configuration,
        ILogger<TelegramBotBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
        
        var botToken = _configuration["Telegram:BotToken"] ?? "DUMMY_TOKEN";
        _botClient = new TelegramBotClient(botToken);
        
        long.TryParse(_configuration["Telegram:AuthorizedUserId"], out _authorizedUserId);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ API khởi động xong trước khi hook Bot
        await Task.Delay(3000, stoppingToken);

        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = Array.Empty<UpdateType>() // Nhận tất cả loại update
        };

        _botClient.StartReceiving(
            updateHandler: HandleUpdateAsync,
            errorHandler: HandlePollingErrorAsync,
            receiverOptions: receiverOptions,
            cancellationToken: stoppingToken
        );

        _logger.LogInformation("Telegram Bot Companion đang hoạt động và lắng nghe tin nhắn...");
        
        // Block background task to keep it running
        await Task.Delay(-1, stoppingToken);
    }

    private async Task HandleUpdateAsync(ITelegramBotClient botClient, Update update, CancellationToken cancellationToken)
    {
        // Chỉ xử lý Text Message
        if (update.Message is not { Text: { } messageText } message)
            return;

        // Chỉ cho phép Authorized User (Chính chủ) sử dụng bot
        if (message.From == null || message.From.Id != _authorizedUserId)
        {
            _logger.LogWarning($"Người dùng trái phép (ID: {message.From?.Id}) cố gắng truy cập bot.");
            return;
        }

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            // Phân tích cú pháp: "Mua ao 200k" hoặc "An trua 45k"
            // Nhận diện cụm số kết thúc bằng chữ 'k'
            var match = Regex.Match(messageText, @"^(.*?)\s+([0-9,.]+)[kK]$");
            
            if (match.Success)
            {
                var desc = match.Groups[1].Value.Trim();
                var amountStr = match.Groups[2].Value.Replace(",", "").Replace(".", "");
                
                if (decimal.TryParse(amountStr, out var amount))
                {
                    amount = amount * 1000; // Đổi từ k sang VND
                    
                    var command = new CreateTransactionCommand
                    {
                        Amount = amount,
                        Description = desc,
                        TransactionDate = DateTime.UtcNow,
                        Source = TransactionSource.Manual,
                        CategoryId = null 
                    };

                    await mediator.Send(command, cancellationToken);
                    
                    // Truy vấn lại số dư để báo cáo
                    var today = DateTime.UtcNow;
                    var dashboard = await mediator.Send(new GetTransactionDashboardQuery 
                    { 
                        Month = today.Month, 
                        Year = today.Year 
                    }, cancellationToken);

                    var balanceFormatted = dashboard.Balance.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
                    var reply = $"✅ Đã ghi nhận **{amount:N0}đ** vào khoản chi.\n" +
                                $"💡 Số dư hiện tại tháng {today.Month}: **{balanceFormatted}đ**";

                    await botClient.SendMessage(
                        chatId: message.Chat.Id,
                        text: reply,
                        parseMode: ParseMode.Markdown,
                        cancellationToken: cancellationToken);
                        
                    return;
                }
            }
            
            // Cú pháp mặc định không nhận dạng được
            await botClient.SendMessage(
                chatId: message.Chat.Id,
                text: "❌ Sai cú pháp! Vui lòng nhập theo dạng: `[Nội dung] [Số tiền]k` (Ví dụ: `Com trua 45k`)",
                parseMode: ParseMode.Markdown,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý tin nhắn Telegram.");
            await botClient.SendMessage(
                chatId: message.Chat.Id,
                text: $"⚠️ Có lỗi hệ thống: {ex.Message}",
                cancellationToken: cancellationToken);
        }
    }

    private Task HandlePollingErrorAsync(ITelegramBotClient botClient, Exception exception, CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Telegram Polling Error");
        return Task.CompletedTask;
    }
}
