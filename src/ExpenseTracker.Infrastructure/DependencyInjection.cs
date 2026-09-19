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

        var connectionString = configuration["DATABASE_URL"] 
            ?? configuration.GetConnectionString("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection");

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
        connectionString = connectionString.Trim();
        if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var schemeEnd = connectionString.IndexOf("://", StringComparison.Ordinal);
                var withoutScheme = connectionString.Substring(schemeEnd + 3);

                var slashIndex = withoutScheme.IndexOf('/');
                var authority = slashIndex >= 0 ? withoutScheme.Substring(0, slashIndex) : withoutScheme;
                var path = slashIndex >= 0 ? withoutScheme.Substring(slashIndex + 1) : "postgres";

                var questionIndex = path.IndexOf('?');
                var database = questionIndex >= 0 ? path.Substring(0, questionIndex) : path;
                if (string.IsNullOrWhiteSpace(database)) database = "postgres";

                var lastAt = authority.LastIndexOf('@');
                string username = "postgres";
                string password = "";
                string hostPort = authority;

                if (lastAt >= 0)
                {
                    var userPass = authority.Substring(0, lastAt);
                    hostPort = authority.Substring(lastAt + 1);

                    var colonIndex = userPass.IndexOf(':');
                    if (colonIndex >= 0)
                    {
                        username = Uri.UnescapeDataString(userPass.Substring(0, colonIndex));
                        password = Uri.UnescapeDataString(userPass.Substring(colonIndex + 1));
                    }
                    else
                    {
                        username = Uri.UnescapeDataString(userPass);
                    }
                }

                var portColon = hostPort.LastIndexOf(':');
                string host = hostPort;
                int port = 5432;

                if (portColon >= 0)
                {
                    host = hostPort.Substring(0, portColon);
                    if (int.TryParse(hostPort.Substring(portColon + 1), out var p))
                    {
                        port = p;
                    }
                }

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
