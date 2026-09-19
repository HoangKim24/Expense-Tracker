using ExpenseTracker.Application.DTOs;
using ExpenseTracker.Application.Interfaces;
using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Infrastructure.Persistence;
using ExpenseTracker.Infrastructure.Services.Gmail.Parsers;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ExpenseTracker.Infrastructure.Services.Gmail;

public class GmailSyncService : IGmailSyncService
{
    private readonly ExpenseDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GmailSyncService> _logger;
    private static DateTime? _lastSyncTime;

    public GmailSyncService(
        ExpenseDbContext context,
        IConfiguration configuration,
        ILogger<GmailSyncService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public Task<DateTime?> GetLastSyncTimeAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_lastSyncTime);
    }

    public async Task<SyncResultDto> SyncTransactionsAsync(CancellationToken cancellationToken = default)
    {
        var result = new SyncResultDto();
        var email = _configuration["Gmail:Email"] ?? _configuration["GMAIL_EMAIL"];
        var appPassword = _configuration["Gmail:AppPassword"] ?? _configuration["GMAIL_APP_PASSWORD"];
        
        // Đọc số ngày quét lùi (mặc định 2 ngày để đảm bảo tốc độ < 10-15s)
        if (!int.TryParse(_configuration["Gmail:LookbackDays"], out var lookbackDays) || lookbackDays <= 0)
        {
            lookbackDays = 2;
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(appPassword))
        {
            result.Success = false;
            result.Message = "Chưa cấu hình Gmail hoặc Mật khẩu ứng dụng (App Password) trong hệ thống.";
            result.Errors.Add("Vui lòng cấu hình Gmail:Email và Gmail:AppPassword trong file .env hoặc appsettings.json.");
            return result;
        }

        using var client = new ImapClient();
        try
        {
            _logger.LogInformation("Đang kết nối tới máy chủ IMAP Gmail: {Email}...", email);
            
            // Timeout 15s để không bị treo
            client.Timeout = 15000;
            await client.ConnectAsync("imap.gmail.com", 993, true, cancellationToken);
            await client.AuthenticateAsync(email, appPassword, cancellationToken);

            var inbox = client.Inbox;
            await inbox.OpenAsync(FolderAccess.ReadOnly, cancellationToken);

            var sinceDate = DateTime.UtcNow.AddDays(-lookbackDays);
            
            // Query lọc trực tiếp trên máy chủ Google (chỉ lấy mail từ MoMo & Cake trong các ngày gần nhất)
            var query = SearchQuery.DeliveredAfter(sinceDate)
                .And(SearchQuery.FromContains("momo").Or(SearchQuery.FromContains("cake")));

            var uids = await inbox.SearchAsync(query, cancellationToken);
            _logger.LogInformation("Tìm thấy {Count} email tiềm năng từ MoMo & Cake từ ngày {Since:dd/MM/yyyy}", uids.Count, sinceDate);

            if (uids.Count == 0)
            {
                result.Success = true;
                result.Message = "Hộp thư đã cập nhật mới nhất. Không có email giao dịch MoMo hoặc Cake nào trong 48h qua.";
                _lastSyncTime = DateTime.UtcNow;
                return result;
            }

            // Lấy danh sách danh mục để tự động phân loại
            var categories = await _context.Categories.ToListAsync(cancellationToken);
            var newTransactionsList = new List<Transaction>();

            // Chỉ tải tối đa 50 mail gần nhất để đảm bảo phản hồi dưới 15 giây
            var recentUids = uids.OrderByDescending(u => u.Id).Take(50).ToList();

            foreach (var uid in recentUids)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var message = await inbox.GetMessageAsync(uid, cancellationToken);
                if (message == null) continue;

                var fromAddress = message.From.ToString().ToLowerInvariant();
                ParsedEmailTransaction? parsedTx = null;

                if (fromAddress.Contains("momo"))
                {
                    parsedTx = MoMoEmailParser.Parse(message);
                }
                else if (fromAddress.Contains("cake"))
                {
                    parsedTx = CakeEmailParser.Parse(message);
                }

                // Nếu không bóc tách được hoặc là email quảng cáo -> bỏ qua
                if (parsedTx == null || parsedTx.Amount <= 0)
                {
                    continue;
                }

                // --- BÀI TOÁN CHỐNG TRÙNG LẶP (DEDUPLICATION) ---
                // Lớp 1: Kiểm tra xem ExternalReference (Mã GD MoMo/Cake) đã tồn tại trong DB chưa
                var alreadyExists = await _context.Transactions
                    .AnyAsync(t => t.MessageId == parsedTx.ExternalReference, cancellationToken);

                if (alreadyExists)
                {
                    result.SkippedCount++;
                    continue;
                }

                // Lớp 2: Smart Match - So khớp với hóa đơn chụp tay trong ngày
                // Nếu người dùng vừa chụp hóa đơn vừa trả bằng MoMo/Cake, liên kết thay vì tạo mới
                var existingSnapTx = await _context.Transactions
                    .FirstOrDefaultAsync(t => 
                        t.Source == TransactionSource.SnapReceipt &&
                        t.Amount == parsedTx.Amount &&
                        t.TransactionDate.Date == parsedTx.TransactionDate.Date &&
                        Math.Abs((t.TransactionDate - parsedTx.TransactionDate).TotalMinutes) <= 90,
                        cancellationToken);

                if (existingSnapTx != null)
                {
                    _logger.LogInformation("Smart Match: Khớp giao dịch {Ref} với hóa đơn chụp tay Id {Id}", parsedTx.ExternalReference, existingSnapTx.Id);
                    existingSnapTx.MessageId = parsedTx.ExternalReference;
                    if (string.IsNullOrEmpty(existingSnapTx.Merchant) || existingSnapTx.Merchant == "Hóa đơn chụp")
                    {
                        existingSnapTx.Merchant = parsedTx.Merchant;
                    }
                    result.SkippedCount++;
                    continue;
                }

                // Lớp 3: Tự động gắn Danh Mục thông minh
                var matchedCategoryId = AutoCategorize(parsedTx.SuggestedCategoryKeyword, categories);

                var newTransaction = new Transaction
                {
                    Amount = parsedTx.Amount,
                    TransactionDate = parsedTx.TransactionDate,
                    Description = parsedTx.Description,
                    Merchant = parsedTx.Merchant,
                    Type = TransactionType.Expense, // 100% là khoản chi
                    Source = parsedTx.Source,
                    MessageId = parsedTx.ExternalReference,
                    CategoryId = matchedCategoryId
                };

                await _context.Transactions.AddAsync(newTransaction, cancellationToken);
                newTransactionsList.Add(newTransaction);
            }

            if (newTransactionsList.Count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
                
                result.SyncedCount = newTransactionsList.Count;
                result.Message = $"Đồng bộ thành công! Đã thêm {result.SyncedCount} giao dịch mới từ MoMo/Cake.";
                
                // Map sang DTO để trả về cho Frontend
                result.NewTransactions = newTransactionsList.Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Amount = t.Amount,
                    TransactionDate = t.TransactionDate,
                    Description = t.Description,
                    Merchant = t.Merchant,
                    Type = t.Type,
                    Source = t.Source,
                    MessageId = t.MessageId,
                    CategoryId = t.CategoryId
                }).ToList();
            }
            else
            {
                result.Message = result.SkippedCount > 0 
                    ? $"Đã quét xong: Toàn bộ {result.SkippedCount} giao dịch gần đây đã được lưu trước đó (không có giao dịch mới)."
                    : "Không phát hiện giao dịch MoMo hoặc Cake mới nào.";
            }

            _lastSyncTime = DateTime.UtcNow;
            result.Success = true;
            result.SyncedAt = _lastSyncTime.Value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xảy ra trong quá trình đồng bộ Gmail.");
            result.Success = false;
            result.Message = $"Lỗi kết nối hoặc đồng bộ Gmail: {ex.Message}";
            result.Errors.Add(ex.Message);
        }
        finally
        {
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, CancellationToken.None);
            }
        }

        return result;
    }

    private Guid? AutoCategorize(string? text, List<Category> categories)
    {
        if (string.IsNullOrWhiteSpace(text) || categories.Count == 0) return null;

        var lower = text.ToLowerInvariant();

        // 1. Cà phê & Đồ uống
        if (lower.Contains("cà phê") || lower.Contains("cafe") || lower.Contains("coffee") 
            || lower.Contains("highlands") || lower.Contains("phúc long") || lower.Contains("starbucks")
            || lower.Contains("trà sữa") || lower.Contains("tocotoco") || lower.Contains("koi thé")
            || lower.Contains("katinat") || lower.Contains("cheese coffee") || lower.Contains("the coffee house"))
        {
            var cat = categories.FirstOrDefault(c => c.Name.Contains("Cà phê") || c.Name.Contains("Đồ uống"));
            if (cat != null) return cat.Id;
        }

        // 2. Di chuyển
        if (lower.Contains("grab") || lower.Contains("be group") || lower.Contains("be ") || lower.Contains("gojek") 
            || lower.Contains("xăng") || lower.Contains("petrolimex") || lower.Contains("gửi xe") || lower.Contains("vé xe")
            || lower.Contains("taxi") || lower.Contains("mai linh") || lower.Contains("vinasun"))
        {
            var cat = categories.FirstOrDefault(c => c.Name.Contains("Di chuyển"));
            if (cat != null) return cat.Id;
        }

        // 3. Ăn uống
        if (lower.Contains("cơm") || lower.Contains("phở") || lower.Contains("bún") || lower.Contains("bánh mì")
            || lower.Contains("kfc") || lower.Contains("lotteria") || lower.Contains("mcdonald") || lower.Contains("jollibee")
            || lower.Contains("pizza") || lower.Contains("quán ăn") || lower.Contains("nhà hàng") || lower.Contains("shopeefood")
            || lower.Contains("baemin") || lower.Contains("ăn uống"))
        {
            var cat = categories.FirstOrDefault(c => c.Name.Contains("Ăn uống"));
            if (cat != null) return cat.Id;
        }

        // 4. Mua sắm
        if (lower.Contains("shopee") || lower.Contains("tiki") || lower.Contains("lazada") || lower.Contains("tiktok")
            || lower.Contains("winmart") || lower.Contains("bách hóa") || lower.Contains("co.op") || lower.Contains("siêu thị")
            || lower.Contains("uniqlo") || lower.Contains("zara"))
        {
            var cat = categories.FirstOrDefault(c => c.Name.Contains("Mua sắm"));
            if (cat != null) return cat.Id;
        }

        // 5. Hóa đơn
        if (lower.Contains("điện lực") || lower.Contains("tiền điện") || lower.Contains("tiền nước") 
            || lower.Contains("internet") || lower.Contains("fpt") || lower.Contains("vnpt") || lower.Contains("viettel"))
        {
            var cat = categories.FirstOrDefault(c => c.Name.Contains("Hóa đơn"));
            if (cat != null) return cat.Id;
        }

        // Mặc định gán danh mục Khác nếu có
        var otherCat = categories.FirstOrDefault(c => c.Name.Contains("Khác"));
        return otherCat?.Id;
    }
}
