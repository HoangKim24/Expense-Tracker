using ExpenseTracker.Api.Middleware;
using ExpenseTracker.Infrastructure;
// using ExpenseTracker.Application; // Add application layer DI if exists
using ExpenseTracker.Application.Features.Transactions.Commands;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Global Exception Handler (.NET 8)
builder.Services.AddExceptionHandler<CustomExceptionHandler>();
builder.Services.AddProblemDetails();

// Add Layers DI
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add MediatR and FluentValidation
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(CreateTransactionCommand).Assembly));
builder.Services.AddValidatorsFromAssembly(typeof(CreateTransactionCommandValidator).Assembly);

// Add CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseExceptionHandler(); // Uses registered IExceptionHandler

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// Ensure DB is created/migrated on startup for Docker compose simplicity
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ExpenseTracker.Infrastructure.Persistence.ExpenseDbContext>();
    db.Database.Migrate();
}

app.Run();
