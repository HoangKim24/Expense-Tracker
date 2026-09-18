<!-- Generated from migrations: 20260517134352_InitialCreate -->
# Database schema (SQL Server DDL)

-- This file contains CREATE TABLE statements and indexes generated
-- based on the project's EF Core InitialCreate migration.

-- Categories
CREATE TABLE [dbo].[Categories] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(MAX) NOT NULL,
    [Description] NVARCHAR(MAX) NOT NULL,
    [Color] NVARCHAR(MAX) NOT NULL,
    [Icon] NVARCHAR(MAX) NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL,
    [UpdatedAt] DATETIME2 NULL
);

-- EmailSyncLogs
CREATE TABLE [dbo].[EmailSyncLogs] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [MessageId] NVARCHAR(450) NOT NULL,
    [Subject] NVARCHAR(MAX) NOT NULL,
    [Merchant] NVARCHAR(MAX) NOT NULL,
    [ReceivedAt] DATETIME2 NOT NULL,
    [Status] INT NOT NULL,
    [ErrorMessage] NVARCHAR(MAX) NULL,
    [RetryCount] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL,
    [UpdatedAt] DATETIME2 NULL
);

CREATE UNIQUE INDEX [IX_EmailSyncLogs_MessageId]
ON [dbo].[EmailSyncLogs]([MessageId]);

-- Transactions
CREATE TABLE [dbo].[Transactions] (
    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Amount] DECIMAL(18,2) NOT NULL,
    [TransactionDate] DATETIME2 NOT NULL,
    [Description] NVARCHAR(MAX) NOT NULL,
    [Merchant] NVARCHAR(MAX) NOT NULL,
    [Type] INT NOT NULL,
    [CategoryId] UNIQUEIDENTIFIER NULL,
    [CreatedAt] DATETIME2 NOT NULL,
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Transactions_Categories_CategoryId]
        FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[Categories]([Id])
        ON DELETE NO ACTION
);

CREATE INDEX [IX_Transactions_CategoryId]
ON [dbo].[Transactions]([CategoryId]);

CREATE INDEX [IX_Transactions_TransactionDate]
ON [dbo].[Transactions]([TransactionDate]);

-- Notes:
-- * The project uses EF Core migrations; running the application will execute
--   the migrations (see Program.cs -> db.Database.Migrate()).
-- * If you want raw SQL from EF Core migrations, you can generate it with:
--   dotnet ef migrations script --idempotent -o schema.sql
