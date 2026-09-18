using ExpenseTracker.Domain.Interfaces;
using ExpenseTracker.Infrastructure.BackgroundJobs;
using ExpenseTracker.Infrastructure.Persistence;
using ExpenseTracker.Infrastructure.Persistence.Repositories;
using ExpenseTracker.Infrastructure.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ExpenseTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        if (!string.IsNullOrWhiteSpace(configuration["Encryption:SecretKey"]) && configuration["Encryption:SecretKey"]?.Length == 32)
        {
            services.AddSingleton<EncryptionHelper>();
        }

        services.AddDbContext<ExpenseDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Background Workers
        services.AddHostedService<TelegramBotBackgroundService>(); // Kích hoạt Bot

        return services;
    }
}
