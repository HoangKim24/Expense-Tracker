# 🚀 T-Expense: Quản lý Chi tiêu Cá nhân (Production-Grade)

Hệ thống quản lý chi tiêu (Expense Tracker) xây dựng theo kiến trúc **Clean Architecture** sử dụng **.NET 8** và **React (PWA)**.
Dự án được thiết kế chuyên nghiệp, áp dụng các Pattern nâng cao nhằm tự động hóa tối đa quy trình quản lý tài chính cá nhân: từ đồng bộ hóa đơn Gmail, bảo mật dữ liệu cấp độ AES-256, đến tích hợp Trợ lý ảo Telegram tiện lợi.

---

## 🌟 Các Tính Năng Cốt Lõi (Phases 1-7)

1. **CQRS & Business Logic Dày Dặn**:

   - Kiến trúc tách bạch giữa Command và Query bằng **MediatR**.
   - Validate dữ liệu nghiêm ngặt qua **FluentValidation**.
   - Tối ưu hóa truy vấn bằng `.AsNoTracking()` mang lại hiệu suất đọc báo cáo siêu tốc.
2. **Tự động hóa Gmail (Automation) 📧**:

   - Sử dụng **Strategy Pattern** linh hoạt để tự động bóc tách (parse) thông báo giao dịch từ Gmail cho Techcombank, MoMo, Timo và Cake.
   - Tích hợp **Polly Resilience Pipeline** tự động retry bằng thuật toán Exponential Backoff khi gặp sự cố mạng (IMAP/Database timeouts).
   - **Idempotency**: Chống trùng lặp giao dịch tự động qua `MessageId`.
3. **Bảo mật Dữ liệu (AES-256 Data-at-rest) 🔐**:

   - Toàn bộ nội dung Email/Hóa đơn ngân hàng thô (`BodyContent`) được tự động mã hóa AES-256 trong CSDL thông qua tính năng **EF Core Value Converters**. Tầng Application luôn nhận được dữ liệu sạch mà không cần biết cơ sở hạ tầng đã mã hóa nó.
4. **Trợ lý ảo Telegram (Companion Bot) 🤖**:

   - Nhập liệu siêu tốc 24/7 thông qua tin nhắn Telegram với cú pháp đơn giản `[Nội dung] [Số tiền]k` (VD: `Uong cafe 55k`).
   - Tự động parse và trả về số dư biến động ngay trên app chat. Bảo mật chặt chẽ qua cơ chế khóa `AuthorizedUserId` (chỉ bạn mới có quyền dùng bot).
5. **Giao diện PWA Mobile-First 📱**:

   - Front-end xây dựng bằng **React + Vite + Tailwind CSS**.
   - Trải nghiệm Native App trên iPhone: Thêm ra Home Screen tự ẩn thanh địa chỉ Safari (Standalone mode), vuốt chạm tràn viền với CSS Safe Area `env(safe-area-inset-bottom)`.
   - Layout 1 tay (One-handed UX) và form "Nhập nhanh" (Quick Add) tự động Focus ô điền số tiền, tự format dấu phẩy.
6. **DevOps & Docker CI/CD 🐳**:

   - Sẵn sàng triển khai với **Docker Compose** (SQL Server + Web API).
   - Luồng **GitHub Actions** tự động hóa: Build Multi-stage Image, Push lên Docker Hub, và gọi SSH vào VPS để triển khai Zero-downtime.
   - Bắt mọi lỗi toàn cục văng ra Frontend dưới định dạng chuẩn **ProblemDetails (RFC 7807)**.

---

## ⚙️ Công Nghệ Sử Dụng

- **Backend**: ASP.NET Core 8 Web API, Entity Framework Core 8, MediatR, FluentValidation, MailKit, Polly, Telegram.Bot, Serilog.
- **Frontend**: React.js, Vite, Tailwind CSS, Lucide-React, Recharts, PWA Manifest.
- **Database**: Microsoft SQL Server 2022.
- **DevOps**: Docker, Docker Compose, GitHub Actions.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Cấu hình hệ thống (`appsettings.json`)

Bạn cần cung cấp các khóa bảo mật vào tệp `src/ExpenseTracker.Api/appsettings.json` (hoặc truyền qua biến môi trường Docker):

```json
{
  "Gmail": {
    "Username": "your-email@gmail.com",
    "AppPassword": "your-16-char-app-password"
  },
  "Encryption": {
    "SecretKey": "32-Ki-Tu-Bi-Mat-Tuyet-Doi-De-Ma-Hoa-AES256"
  },
  "Telegram": {
    "BotToken": "BOT_FATHER_TOKEN_CUA_BAN",
    "AuthorizedUserId": "ID_TELEGRAM_CUA_BAN_(SO_NGUYEN)"
  }
}
```

### 2. Khởi chạy toàn bộ hệ thống bằng Docker

Chỉ với 1 lệnh duy nhất, hệ thống Database và Backend API (Kèm theo Background Job quét Mail và Telegram Bot) sẽ được khởi chạy ngầm:

```bash
docker-compose up -d --build
```

> Swagger UI (Tài liệu API) sẽ có sẵn tại: `http://localhost:8080/swagger`

### 3. Khởi chạy Giao diện Frontend (PWA)

Mở một Terminal mới, đi vào thư mục Frontend:

```bash
cd expense-tracker-web
npm install
npm run dev -- --host
```

Mở trình duyệt ở máy tính hoặc truy cập IP LAN (Ví dụ: `http://192.168.1.5:5173`) trên trình duyệt Safari của iPhone. Chọn "Thêm vào màn hình chính" (Add to Home Screen) để trải nghiệm giao diện App Native 100%!

---

*Dự án được xây dựng dựa trên nguyên lý thiết kế hệ thống vững chắc nhất, mang lại độ ổn định cao và sẵn sàng đáp ứng mọi nhu cầu mở rộng cá nhân của bạn.*
