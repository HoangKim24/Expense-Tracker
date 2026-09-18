using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Infrastructure.Persistence;

public class ExpenseDbContext : DbContext
{
    public ExpenseDbContext(DbContextOptions<ExpenseDbContext> options) : base(options) 
    { 
    }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Transaction>(entity => 
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Amount).HasColumnType("decimal(18,2)");
            entity.HasIndex(t => t.TransactionDate);
            entity.Property(t => t.MessageId).HasMaxLength(255);
            entity.HasIndex(t => t.MessageId).IsUnique().HasFilter("[MessageId] IS NOT NULL");
            entity.Property(t => t.ReceiptImagePath).HasMaxLength(500);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Budget).HasColumnType("decimal(18,2)");
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
        });

        // Seed default categories
        var catFood = new Category
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Ăn uống",
            Description = "Cơm, bún, phở, đồ ăn hàng ngày",
            Color = "#f97316",
            Icon = "Utensils",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catCoffee = new Category
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Cà phê & Đồ uống",
            Description = "Cà phê, trà sữa, nước giải khát",
            Color = "#8b5cf6",
            Icon = "Coffee",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catShopping = new Category
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Name = "Mua sắm",
            Description = "Quần áo, đồ gia dụng, thiết bị",
            Color = "#ec4899",
            Icon = "ShoppingBag",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catTransport = new Category
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Name = "Di chuyển",
            Description = "Xăng xe, Grab, gửi xe",
            Color = "#3b82f6",
            Icon = "Car",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catBills = new Category
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            Name = "Hóa đơn & Nhà cửa",
            Description = "Điện, nước, internet, tiền nhà",
            Color = "#10b981",
            Icon = "Home",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catIncome = new Category
        {
            Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
            Name = "Lương & Thu nhập",
            Description = "Tiền lương, thưởng, thu nhập phụ",
            Color = "#059669",
            Icon = "Wallet",
            Type = CategoryType.Income,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var catOther = new Category
        {
            Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
            Name = "Khác",
            Description = "Chi phí linh tinh khác",
            Color = "#64748b",
            Icon = "MoreHorizontal",
            Type = CategoryType.Expense,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        modelBuilder.Entity<Category>().HasData(catFood, catCoffee, catShopping, catTransport, catBills, catIncome, catOther);

        base.OnModelCreating(modelBuilder);
    }
}
