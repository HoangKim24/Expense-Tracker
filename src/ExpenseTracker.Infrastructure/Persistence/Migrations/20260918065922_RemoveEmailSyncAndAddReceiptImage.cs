using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ExpenseTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEmailSyncAndAddReceiptImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailSyncLogs");

            migrationBuilder.AddColumn<string>(
                name: "ReceiptImagePath",
                table: "Transactions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Budget", "Color", "CreatedAt", "Description", "Icon", "Name", "Type", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), null, "#f97316", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Cơm, bún, phở, đồ ăn hàng ngày", "Utensils", "Ăn uống", 1, null },
                    { new Guid("22222222-2222-2222-2222-222222222222"), null, "#8b5cf6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Cà phê, trà sữa, nước giải khát", "Coffee", "Cà phê & Đồ uống", 1, null },
                    { new Guid("33333333-3333-3333-3333-333333333333"), null, "#ec4899", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Quần áo, đồ gia dụng, thiết bị", "ShoppingBag", "Mua sắm", 1, null },
                    { new Guid("44444444-4444-4444-4444-444444444444"), null, "#3b82f6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Xăng xe, Grab, gửi xe", "Car", "Di chuyển", 1, null },
                    { new Guid("55555555-5555-5555-5555-555555555555"), null, "#10b981", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Điện, nước, internet, tiền nhà", "Home", "Hóa đơn & Nhà cửa", 1, null },
                    { new Guid("66666666-6666-6666-6666-666666666666"), null, "#059669", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Tiền lương, thưởng, thu nhập phụ", "Wallet", "Lương & Thu nhập", 2, null },
                    { new Guid("77777777-7777-7777-7777-777777777777"), null, "#64748b", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chi phí linh tinh khác", "MoreHorizontal", "Khác", 1, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"));

            migrationBuilder.DropColumn(
                name: "ReceiptImagePath",
                table: "Transactions");

            migrationBuilder.CreateTable(
                name: "EmailSyncLogs",
                columns: table => new
                {
                    MessageId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    BodyContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MerchantName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailSyncLogs", x => x.MessageId);
                });
        }
    }
}
