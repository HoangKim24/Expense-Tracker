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
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(IMediator mediator, ILogger<TransactionsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
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
    public async Task<IActionResult> UploadReceipt(
        IFormFile? file, 
        [FromServices] IWebHostEnvironment env,
        [FromServices] IConfiguration config)
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

        var uniqueFileName = $"receipt_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{extension}";

        // Tự động upload lên Supabase Storage nếu có cấu hình
        var supabaseUrl = config["SUPABASE_URL"];
        var supabaseKey = config["SUPABASE_SERVICE_ROLE_KEY"] ?? config["SUPABASE_KEY"] ?? config["SUPABASE_ANON_KEY"];

        if (!string.IsNullOrEmpty(supabaseUrl) && !string.IsNullOrEmpty(supabaseKey))
        {
            try
            {
                var cleanUrl = supabaseUrl.Trim().TrimEnd('/');
                if (cleanUrl.EndsWith("/rest/v1", StringComparison.OrdinalIgnoreCase))
                {
                    cleanUrl = cleanUrl.Substring(0, cleanUrl.Length - "/rest/v1".Length).TrimEnd('/');
                }
                else if (cleanUrl.EndsWith("/rest", StringComparison.OrdinalIgnoreCase))
                {
                    cleanUrl = cleanUrl.Substring(0, cleanUrl.Length - "/rest".Length).TrimEnd('/');
                }

                var cleanKey = supabaseKey.Trim();
                var endpoint = $"{cleanUrl}/storage/v1/object/receipts/{uniqueFileName}";
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("apikey", cleanKey);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {cleanKey}");

                using var stream = file.OpenReadStream();
                using var content = new StreamContent(stream);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType ?? "image/jpeg");

                var response = await client.PostAsync(endpoint, content);
                if (response.IsSuccessStatusCode)
                {
                    var publicUrl = $"{cleanUrl}/storage/v1/object/public/receipts/{uniqueFileName}";
                    _logger.LogInformation("Receipt successfully uploaded to Supabase Storage: {Url}", publicUrl);
                    return Ok(new { url = publicUrl, path = publicUrl });
                }
                else
                {
                    var errBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Supabase Storage upload failed with status {StatusCode}: {ErrorBody}. Falling back to local storage.", response.StatusCode, errBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Supabase Storage upload encountered an exception. Falling back to local storage.");
            }
        }

        // Lưu trữ cục bộ mặc định
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, uniqueFileName);
        using (var localStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(localStream);
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
