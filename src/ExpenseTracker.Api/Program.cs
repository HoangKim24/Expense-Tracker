using ExpenseTracker.Api.Middleware;
using ExpenseTracker.Application;
using ExpenseTracker.Infrastructure;
using ExpenseTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Serilog;
// Cấu hình Npgsql cho phép ghi DateTime linh hoạt trên PostgreSQL
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Tự động nạp biến môi trường từ file .env nếu có
var envCandidatePaths = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".env")
};

foreach (var envPath in envCandidatePaths)
{
    if (File.Exists(envPath))
    {
        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#')) continue;
            var parts = trimmed.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = parts[0].Trim().Replace("__", ":");
                var val = parts[1].Trim();
                builder.Configuration[key] = val;
                Environment.SetEnvironmentVariable(parts[0].Trim(), val);
            }
        }
        break;
    }
}

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

// Ensure static files directory exists before serving
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsDir = Path.Combine(webRoot, "uploads");
if (!Directory.Exists(uploadsDir))
{
    Directory.CreateDirectory(uploadsDir);
}

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

                // Kích hoạt Row Level Security (RLS) để giải quyết cảnh báo bảo mật Supabase
                try
                {
                    await db.Database.ExecuteSqlRawAsync(@"
                        ALTER TABLE IF EXISTS ""Categories"" ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE IF EXISTS ""Transactions"" ENABLE ROW LEVEL SECURITY;
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_policies WHERE tablename = 'Categories' AND policyname = 'Allow public read on Categories'
                            ) THEN
                                CREATE POLICY ""Allow public read on Categories"" ON ""Categories"" FOR SELECT USING (true);
                            END IF;

                            -- Tự động cấp quyền lưu và đọc ảnh cho bucket receipts
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public select on receipts'
                            ) THEN
                                CREATE POLICY ""Allow public select on receipts"" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
                            END IF;
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public insert on receipts'
                            ) THEN
                                CREATE POLICY ""Allow public insert on receipts"" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
                            END IF;
                        END
                        $$;
                    ");
                    app.Logger.LogInformation("RLS and storage policies configured on Supabase.");
                }
                catch (Exception ex)
                {
                    app.Logger.LogWarning(ex, "Could not automatically configure policies on Supabase.");
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
