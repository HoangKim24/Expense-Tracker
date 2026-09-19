using ExpenseTracker.Api.Middleware;
using ExpenseTracker.Application;
using ExpenseTracker.Infrastructure;
using ExpenseTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog (đọc cấu hình từ appsettings.json)
builder.Host.UseSerilog((context, loggerConfiguration) =>
    loggerConfiguration.ReadFrom.Configuration(context.Configuration));

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Global Exception Handler (.NET 8)
builder.Services.AddExceptionHandler<CustomExceptionHandler>();
builder.Services.AddProblemDetails();

// Add Layers DI
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Health check
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ExpenseDbContext>("database");

// Add CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseExceptionHandler(); // Uses registered IExceptionHandler
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// Auto database initialization (Supports both PostgreSQL on Supabase and SQL Server)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ExpenseDbContext>();
    const int maxAttempts = 10;

    for (var attempt = 1; ; attempt++)
    {
        try
        {
            if (db.Database.IsNpgsql())
            {
                // Supabase PostgreSQL: Kiểm tra xem bảng Categories đã tồn tại chưa
                try
                {
                    await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM \"Categories\" LIMIT 1;");
                }
                catch
                {
                    app.Logger.LogInformation("Creating tables and seeding data on Supabase PostgreSQL...");
                    try
                    {
                        var creator = db.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
                        await creator.CreateTablesAsync();
                    }
                    catch
                    {
                        var sql = db.Database.GenerateCreateScript();
                        await db.Database.ExecuteSqlRawAsync(sql);
                    }
                    app.Logger.LogInformation("Tables created successfully on Supabase.");
                }
            }
            else
            {
                // SQL Server: Chạy migration
                await db.Database.MigrateAsync();
            }
            break;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            app.Logger.LogWarning(ex, "Database is not ready. Retrying connection ({Attempt}/{MaxAttempts}).", attempt, maxAttempts);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }
}

app.Run();
