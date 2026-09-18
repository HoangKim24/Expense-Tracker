Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 Đang khởi động T-Expense System (Backend + Web)..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Đảm bảo LocalDB hoạt động
sqllocaldb start MSSQLLocalDB | Out-Null

# 2. Khởi chạy Backend API (.NET 8)
Write-Host "👉 Khởi chạy Backend API (.NET 8) tại http://localhost:5080 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Expense Tracker\src\ExpenseTracker.Api'; dotnet run --launch-profile http"

Start-Sleep -Seconds 3

# 3. Khởi chạy Frontend Web (Vite)
Write-Host "👉 Khởi chạy Frontend Web tại http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Expense Tracker\expense-tracker-web'; npm run dev -- --host"

Write-Host "`n✅ Cả 2 dịch vụ đã được mở trong 2 cửa sổ PowerShell riêng biệt!" -ForegroundColor Green
Write-Host "👉 Trình duyệt sẽ mở: http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"
