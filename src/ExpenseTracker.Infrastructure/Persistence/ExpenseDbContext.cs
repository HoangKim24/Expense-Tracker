using ExpenseTracker.Domain.Entities;
using ExpenseTracker.Infrastructure.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ExpenseTracker.Infrastructure.Persistence;

public class ExpenseDbContext : DbContext
{
    private readonly EncryptionHelper _encryptionHelper;

    public ExpenseDbContext(DbContextOptions<ExpenseDbContext> options, EncryptionHelper encryptionHelper) : base(options) 
    { 
        _encryptionHelper = encryptionHelper;
    }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<EmailSyncLog> EmailSyncLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Value Converter cho AES-256 mã hóa BodyContent
        var encryptionConverter = new ValueConverter<string, string>(
            v => _encryptionHelper.Encrypt(v),
            v => _encryptionHelper.Decrypt(v)
        );

        modelBuilder.Entity<Transaction>(entity => 
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Amount).HasColumnType("decimal(18,2)");
            entity.HasIndex(t => t.TransactionDate);
            entity.Property(t => t.MessageId).HasMaxLength(255);
            entity.HasIndex(t => t.MessageId).IsUnique().HasFilter("[MessageId] IS NOT NULL");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Budget).HasColumnType("decimal(18,2)");
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<EmailSyncLog>(entity =>
        {
            entity.HasKey(e => e.MessageId); 
            entity.Property(e => e.MessageId).HasMaxLength(255);
            entity.Property(e => e.Subject).HasMaxLength(500);
            entity.Property(e => e.MerchantName).HasMaxLength(100);
            
            // Gắn Converter tự động mã hóa vào trường BodyContent
            entity.Property(e => e.BodyContent)
                  .HasColumnType("nvarchar(max)")
                  .HasConversion(encryptionConverter);
        });

        base.OnModelCreating(modelBuilder);
    }
}
