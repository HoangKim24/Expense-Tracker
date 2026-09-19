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

        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? configuration["DATABASE_URL"];

        services.AddDbContext<ExpenseDbContext>(options =>
        {
            var isPostgres = !string.IsNullOrEmpty(connectionString) &&
                (connectionString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase) ||
                 connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
                 configuration["DB_PROVIDER"]?.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase) == true);

            if (isPostgres)
            {
                options.UseNpgsql(NormalizePostgresConnectionString(connectionString!));
            }
            else
            {
                options.UseSqlServer(connectionString ?? configuration.GetConnectionString("DefaultConnection"));
            }
        });

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Background Workers
        services.AddHostedService<TelegramBotBackgroundService>(); // Kích hoạt Bot

        return services;
    }

    private static string NormalizePostgresConnectionString(string connectionString)
    {
        if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(connectionString);
                var userInfo = uri.UserInfo.Split(':');
                var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');

                return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
            }
            catch
            {
                return connectionString;
            }
        }
        return connectionString;
    }
}
