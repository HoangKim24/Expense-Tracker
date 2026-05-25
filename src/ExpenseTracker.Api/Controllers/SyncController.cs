using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Nodes;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly IRepository<EmailSyncLog> _syncLogRepo;

    public SyncController(IRepository<EmailSyncLog> syncLogRepo)
    {
        _syncLogRepo = syncLogRepo;
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetSyncLogs()
    {
        var logs = await _syncLogRepo.GetAllAsync();
        return Ok(logs.OrderByDescending(l => l.ReceivedDate));
    }

    // A mock endpoint to simulate saving Gmail Config (In a real app, this would write to secure store/DB)
    [HttpPost("settings")]
    public IActionResult SaveGmailSettings([FromBody] JsonObject settings)
    {
        // Currently we use appsettings.json. In production, this might write to a User configuration table.
        return Ok(new { Message = "Settings saved successfully" });
    }
}
