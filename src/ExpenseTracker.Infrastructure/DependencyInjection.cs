using ExpenseTracker.Application.Interfaces;
using ExpenseTracker.Domain.Interfaces;
using ExpenseTracker.Infrastructure.BackgroundJobs;
using ExpenseTracker.Infrastructure.Persistence;
using ExpenseTracker.Infrastructure.Persistence.Repositories;
using ExpenseTracker.Infrastructure.Services;
using ExpenseTracker.Infrastructure.Services.Security;
using ExpenseTracker.Infrastructure.Services.Strategies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ExpenseTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Khởi tạo EncryptionHelper dưới dạng Singleton để truyền vào DbContext (hoặc đăng ký theo cách khác)
        var encryptionHelper = new EncryptionHelper(configuration);
        services.AddSingleton(encryptionHelper);

        services.AddDbContext<ExpenseDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddSingleton<IGmailService, GmailService>();
        
        services.AddSingleton<IEmailParserStrategy, GrabEmailParser>();
        services.AddSingleton<IEmailParserStrategy, MBBankEmailParser>();
        services.AddSingleton<IEmailParserStrategy, TechcombankEmailParser>();
        services.AddSingleton<IEmailParserStrategy, MomoEmailParser>();
        services.AddSingleton<IEmailParserStrategy, TimoEmailParser>();
        services.AddSingleton<IEmailParserStrategy, CakeEmailParser>();
        services.AddSingleton<EmailParserFactory>();

        // Background Workers
        services.AddHostedService<EmailSyncBackgroundService>();
        services.AddHostedService<TelegramBotBackgroundService>(); // Kích hoạt Bot

        return services;
    }
}
