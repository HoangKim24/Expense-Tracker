using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExpenseTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelWithEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_EmailSyncLogs",
                table: "EmailSyncLogs");

            migrationBuilder.DropIndex(
                name: "IX_EmailSyncLogs_MessageId",
                table: "EmailSyncLogs");

            migrationBuilder.RenameColumn(
                name: "ReceivedAt",
                table: "EmailSyncLogs",
                newName: "ReceivedDate");

            migrationBuilder.RenameColumn(
                name: "Merchant",
                table: "EmailSyncLogs",
                newName: "BodyContent");

            migrationBuilder.AddColumn<string>(
                name: "MessageId",
                table: "Transactions",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "Transactions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "EmailSyncLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "MessageId",
                table: "EmailSyncLogs",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "MerchantName",
                table: "EmailSyncLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<decimal>(
                name: "Budget",
                table: "Categories",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Categories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_EmailSyncLogs",
                table: "EmailSyncLogs",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_MessageId",
                table: "Transactions",
                column: "MessageId",
                unique: true,
                filter: "[MessageId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_MessageId",
                table: "Transactions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EmailSyncLogs",
                table: "EmailSyncLogs");

            migrationBuilder.DropColumn(
                name: "MessageId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "MerchantName",
                table: "EmailSyncLogs");

            migrationBuilder.DropColumn(
                name: "Budget",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "ReceivedDate",
                table: "EmailSyncLogs",
                newName: "ReceivedAt");

            migrationBuilder.RenameColumn(
                name: "BodyContent",
                table: "EmailSyncLogs",
                newName: "Merchant");

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "EmailSyncLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "MessageId",
                table: "EmailSyncLogs",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddPrimaryKey(
                name: "PK_EmailSyncLogs",
                table: "EmailSyncLogs",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_EmailSyncLogs_MessageId",
                table: "EmailSyncLogs",
                column: "MessageId",
                unique: true);
        }
    }
}
