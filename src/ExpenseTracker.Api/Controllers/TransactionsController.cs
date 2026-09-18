using ExpenseTracker.Application.Features.Dashboard.Queries;
using ExpenseTracker.Application.Features.Transactions.Commands;
using ExpenseTracker.Application.Features.Transactions.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TransactionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(new { Id = result });
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTransactionsQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTransaction(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteTransactionCommand(id), cancellationToken);
        return Ok(new { success = result });
    }

    [HttpPost("upload-receipt")]
    public async Task<IActionResult> UploadReceipt(IFormFile? file, [FromServices] IWebHostEnvironment env)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Không có file ảnh nào được tải lên." });

        if (file.Length > 10 * 1024 * 1024) // 10MB limit
            return BadRequest(new { message = "Kích thước ảnh tối đa là 10MB." });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".heic" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
        {
            extension = ".jpg";
        }

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"receipt_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativePath = $"/uploads/{uniqueFileName}";
        return Ok(new { url = relativePath, path = relativePath });
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int month, [FromQuery] int year, CancellationToken cancellationToken)
    {
        if (month == 0 || year == 0)
        {
            var today = DateTime.UtcNow;
            month = today.Month;
            year = today.Year;
        }
        
        var query = new GetTransactionDashboardQuery { Month = month, Year = year };
        var result = await _mediator.Send(query, cancellationToken);
        
        return Ok(result);
    }
}
