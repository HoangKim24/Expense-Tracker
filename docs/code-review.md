Date: 2026-05-29

## Summary

- I built the entire solution (`dotnet build ExpenseTracker.sln`) — build succeeded with no compilation errors.
- EF Core migrations exist (InitialCreate) and DDL extracted to `docs/database-schema.sql.md`.
- Background worker for Gmail sync (`EmailSyncBackgroundService`) and `GmailService` (MailKit/IMAP) implemented.

## Files checked

- `src/ExpenseTracker.Api` — program, controllers, appsettings
- `src/ExpenseTracker.Infrastructure` — DI, services, Gmail, background jobs, persistence, migrations
- `src/ExpenseTracker.Application` & `src/ExpenseTracker.Domain` — DTOs, commands, entities

## Findings / Recommendations

1. Configuration placeholders
   - `src/ExpenseTracker.Api/appsettings.json` contains placeholder credentials for Gmail and SQL. Do NOT commit real secrets. Use user secrets / environment variables for production.

2. Database connection defaults
   - `docker-compose.yml` uses `Database=ExpenseTrackerDb`, while `appsettings.json` uses `Database=ExpenseTracker`. This is not harmful but inconsistent — consider aligning names.

3. Local development run
   - Current `appsettings.json` connection string points to host `db` which only exists in Docker compose. To run locally without Docker, set `ConnectionStrings__DefaultConnection` to your SQL Server instance (LocalDB / SQLEXPRESS) or use environment variables.

4. Error handling
   - `EmailParsingHelper.ExtractAmount` throws `InvalidOperationException` when amount cannot be parsed. This is handled by the caller (`EmailSyncBackgroundService`) which marks the sync log as Failed, so behaviour is acceptable. Consider returning a parse result with a success flag for finer control.

5. Security
   - `GmailService.TryGetCredentials` expects `Gmail:Username` and `Gmail:AppPassword`. Recommend documenting how to generate Gmail App Password (see `docs/IPHONE_INSTALL.md`), and using secret store.

6. Observability
   - Serilog is configured in `appsettings.json` to log to `logs/log-.txt`. Ensure the `logs` folder is writable in your deployment.

## Suggested automatic, low-risk fixes (apply if you want)

1. Add a `appsettings.Development.json` with a local-friendly connection string example (LocalDB) — I can add this file if you want.
2. Add `appsettings.json.example` that contains placeholders instead of real-looking passwords.
3. Align DB name between `docker-compose.yml` and `appsettings.json` if you prefer consistency.

## Next steps I can do for you

- Create `appsettings.Development.json` with a LocalDB example and instructions.
- Replace hardcoded placeholders with `appsettings.json.example` and add guidance on using environment variables.
- Run the app locally (requires a reachable SQL Server configured by you) and verify `/api/sync/logs` and background worker behavior.

If you want me to apply any of the suggested automatic fixes, tell me which one and provide your preferred local SQL connection string (or say "use LocalDB sample").