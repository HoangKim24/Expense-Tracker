# 📋 Kế hoạch Phát triển — T-Expense (Expense Tracker)

> Ngày lập: 2026-08-28
> Hướng: Cá nhân (1 người dùng), tự host trên VPS cá nhân
> Phạm vi: Backend .NET 8, Frontend React PWA, Telegram Bot, Gmail Sync

---

## 1. Tầm nhìn & Mục tiêu

**Tầm nhìn:** Trợ lý tài chính cá nhân tự động — mở app là thấy ngay hôm nay đã chi bao nhiêu, tháng này còn bao nhiêu, không cần nhập tay.

| # | Mục tiêu | KPI |
|---|---|---|
| M1 | Nhập liệu không cần tay | ≥ 90% giao dịch ngân hàng/MoMo được tự động ghi nhận từ Gmail |
| M2 | Dữ liệu chính xác, không trùng | 0 giao dịch trùng (Idempotency 100%) |
| M3 | Trải nghiệm mobile mượt | Mở PWA trên iPhone → thêm giao dịch < 5 giây |
| M4 | Báo cáo có giá trị thực | Xem được xu hướng chi tiêu theo ngày/tuần/tháng, so sánh tháng trước |
| M5 | Bảo mật dữ liệu cá nhân | 0 secret trong repo; email ngân hàng mã hóa AES-256 at-rest |

---

## 2. Đánh giá hiện trạng

### 2.1 Điểm mạnh (đã kiểm chứng từ code)

- **Clean Architecture 4 lớp** chuẩn: Domain → Application → Infrastructure → Api.
- **CQRS + MediatR + FluentValidation**: dễ thêm feature.
- **Strategy Pattern** cho parser ngân hàng (`EmailParserFactory`): thêm 1 bank = 1 class.
- **Idempotency** qua `MessageId` + **Polly retry** (Exponential Backoff).
- **AES-256 at-rest** qua EF Core Value Converter (email ngân hàng).
- **DevOps sẵn sàng**: Docker, docker-compose, GitHub Actions deploy VPS.
- **Frontend hiện đại**: React 19 + Vite + Tailwind 4 + PWA, UX mobile-first.
- **Telegram Bot** nhập siêu tốc + khóa `AuthorizedUserId` (chỉ mình dùng).

### 2.2 Khoảng trống (Gaps) — đầu việc cần làm

| ID | Gap | Mức ưu tiên |
|---|---|---|
| G1 | Không có CRUD Category (backend có entity/DTO nhưng thiếu controller; frontend dùng mock `number` vs backend `Guid`) | 🔴 Cao |
| G2 | Không có test project (CI còn comment `# Run Tests`) | 🔴 Cao |
| G3 | Frontend phụ thuộc mock data; biểu đồ Weekly Spending là thanh cứng (hardcode) | 🟠 TB |
| G4 | Analytics sơ sài: gộp theo description thay vì category, tab "Tháng trước" chưa hoạt động | 🟠 TB |
| G5 | Telegram Bot chỉ nhập chi tiêu, chưa có thu nhập/lệnh báo cáo | 🟠 TB |
| G6 | Field `Category.Budget` đã có nhưng chưa dùng (bỏ phí cảnh báo ngân sách) | 🟡 Thấp |
| G7 | Kỹ thuật: fallback key mã hóa cứng, tên DB không nhất quán, chưa pagination | 🟠 TB |
| G8 | Chưa có recurring transactions + xuất dữ liệu (CSV/PDF) | 🟡 Thấp |

> Ghi chú: **Không cần** Authentication/JWT, rate limiting, đa người dùng vì đây là app cá nhân self-host. Cơ chế bảo vệ hiện tại (Telegram `AuthorizedUserId` + API chỉ chạy trên VPS cá nhân) là đủ.

---

## 3. Kiến trúc mục tiêu

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React PWA)                 │
│  Dashboard · Analytics · History · Settings · Budgets   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP (localhost / LAN)
┌──────────────────────────▼──────────────────────────────┐
│                 ExpenseTracker.Api (gateway)            │
│  Controllers · Middleware · ProblemDetails · HealthCheck│
└──────────────────────────┬──────────────────────────────┘
┌──────────────────────────▼──────────────────────────────┐
│            Application (Use Cases + CQRS)               │
│  Commands/Queries · Validators · Domain Events          │
└──────────────────────────┬──────────────────────────────┘
┌──────────────────────────▼──────────────────────────────┐
│           Infrastructure (Adapters)                     │
│  EF Core · Repositories · Gmail(IMAP) · Telegram ·      │
│  Email Parsers (Strategy) · Encryption · BackgroundJobs │
└──────────────────────────┬──────────────────────────────┘
                    ┌──────┴────────┐
              ┌─────▼─────┐  ┌──────▼──────┐
              │ SQL Server│  │  External   │
              │ (AES-256) │  │ (Gmail/Bot) │
              └───────────┘  └─────────────┘
```

**Nguyên tắc mở rộng (bất biến):**
1. Domain không phụ thuộc thư viện ngoài.
2. Mọi tính năng mới qua MediatR (Command/Query) — không viết logic trong Controller.
3. Mọi thay đổi schema qua EF Core Migration.
4. Dữ liệu nhạy cảm (email) luôn mã hóa at-rest qua Value Converter.

---

## 4. Lộ trình phát triển

### 🔵 Phase 1 — Ổn định nền tảng (ưu tiên cao nhất)

| # | Task | Chi tiết | AC | Effort |
|---|---|---|---|---|
| 1.1 | Chuẩn hóa bảo mật mã hóa | Bỏ fallback key cứng trong `EncryptionHelper`; thêm section `Encryption` vào appsettings; dùng biến môi trường khi deploy | App không khởi động nếu thiếu key 32 ký tự | S |
| 1.2 | Đồng bộ tên DB | Thống nhất `ExpenseTrackerDb` giữa docker-compose & appsettings | Cùng 1 tên DB mọi nơi | XS |
| 1.3 | Sửa appsettings.Development | Thêm connection string LocalDB mẫu + hướng dẫn chạy local | Dev chạy local không cần Docker | XS |
| 1.4 | Test project (xUnit) | Tạo `ExpenseTracker.Tests`; test `EmailParsingHelper` (amount/date/type), test `CreateTransactionCommandHandler`, test từng parser | CI `dotnet test` xanh; test bao phủ parser | M |
| 1.5 | Bật test trong CI | Bỏ comment `# Run Tests` trong deploy.yml | Pipeline chạy test thật trước khi deploy | S |
| 1.6 | Pagination & filter server-side | Thêm phân trang + lọc (tháng/năm/type/category) vào `GetTransactionsQuery` | API trả cấu trúc phân trang; không load toàn bộ | M |
| 1.7 | Hoàn thiện Category CRUD | `CategoriesController` + Command/Query CRUD + Seed danh mục mặc định (ăn uống, cà phê, mua sắm, di chuyển, sức khỏe, nhà cửa...) | CRUD hoạt động qua Swagger; seed dữ liệu mẫu | M |
| 1.8 | Nối Category frontend ↔ backend | Thay `mockData.ts` category bằng API; map `Guid` thay `number`; QuickAdd chọn category từ DB | Form nhập + filter dùng category thật từ API | M |

### 🔵 Phase 2 — Hoàn thiện sản phẩm cốt lõi

| # | Task | Chi tiết | AC | Effort |
|---|---|---|---|---|
| 2.1 | Auto-categorize theo Merchant | Map merchant → category (TODO sẵn trong `EmailSyncBackgroundService` dòng 109) | Giao dịch từ Gmail tự gán đúng category | M |
| 2.2 | Ngân sách & cảnh báo (Budget) | Dùng `Category.Budget`; Dashboard hiển thị % ngân sách từng danh mục; cảnh báo vượt | Dashboard có progress bar ngân sách; Telegram alert khi vượt 80% | M |
| 2.3 | Analytics nâng cao | Trend ngày/tuần/tháng; so sánh tháng trước; biểu đồ nối dữ liệu thật (bỏ thanh hardcode) | Tab "Tháng trước" hoạt động; biểu đồ phản ánh DB | L |
| 2.4 | Telegram Bot mở rộng | Thu nhập (`thu 10tr`), lệnh `/baocao` (tháng này), `/homnay`, `/conlai` (số dư còn lại) | Bot nhận cả thu/chi + trả báo cáo nhanh | M |
| 2.5 | Recurring transactions | Chi phí định kỳ (tiền nhà, điện, nước, Netflix...) tự tạo giao dịch đúng chu kỳ | Giao dịch định kỳ được tạo đúng lịch, không trùng | L |
| 2.6 | Xuất dữ liệu | Export CSV/PDF báo cáo tháng từ giao diện | Tải file báo cáo 1 click | M |

### 🔵 Phase 3 — Trải nghiệm & Tiện ích

| # | Task | Chi tiết | AC | Effort |
|---|---|---|---|---|
| 3.1 | Thêm ngân hàng mới (dễ làm) | Parser cho Vietcombank, BIDV, ZaloPay — mỗi cái chỉ thêm 1 class | Parse được thêm 2-3 ngân hàng phổ biến | S-M |
| 3.2 | Ghi chú nhanh bằng giọng nói | Tích hợp Web Speech API trên PWA → nói "cà phê 45k" thay vì gõ | Nhập liệu bằng giọng nói hoạt động trên mobile | M |
| 3.3 | Widget / Shortcut iOS | Dùng Shortcuts app + API endpoint để thêm giao dịch từ widget | Thêm giao dịch từ màn hình chính iPhone không cần mở app | M |
| 3.4 | Backup & Restore | Tự động backup DB định kỳ; nút restore từ file | Dữ liệu an toàn khi chuyển VPS hoặc reset | M |

### 🔵 Phase 4 — Vận hành lâu dài

| # | Task | Chi tiết | AC | Effort |
|---|---|---|---|---|
| 4.1 | Health check + cảnh báo downtime | `/health` endpoint; Telegram alert nếu API down | Bot báo khi dịch vụ gặp sự cố | S |
| 4.2 | Cache & tối ưu query | Response caching dashboard; thêm index cần thiết | Dashboard load < 500ms | M |
| 4.3 | Docker image tối ưu | Giảm kích thước image (alpine-based runtime, trim dependencies) | Image < 200MB | M |
| 4.4 | Tổng kết năm | Báo cáo tổng kết năm: tổng thu/chi, top danh mục, xu hướng 12 tháng | Xem được "Year in Review" cuối năm | M |

---

## 5. Cột mốc (Milestones)

| Mốc | Điều kiện hoàn thành | Dự kiến |
|---|---|---|
| **M0 — Foundation** | Phase 1 xong: test xanh, category CRUD, không nợ kỹ thuật | 2 tuần |
| **M1 — Dùng ngon hằng ngày** | Phase 2 xong: auto-categorize, budget, analytics thật, bot đầy đủ | +3-4 tuần |
| **M2 — Tiện ích mở rộng** | Phase 3 xong: thêm bank, giọng nói, widget, backup | +2-3 tuần |
| **M3 — Ổn định dài hạn** | Phase 4 xong: health check, cache, tổng kết năm | +2 tuần |

---

## 6. Rủi ro & Giải pháp

| Rủi ro | Tác động | Giải pháp |
|---|---|---|
| Ngân hàng thay đổi cấu trúc email → parser hỏng | Giao dịch parse sai/bỏ sót | Test hồi quy parser (Phase 1.4); lưu email thô trong sync log để debug |
| Lộ secret (Gmail app password, bot token) nếu commit nhầm | Bảo mật bị phá vỡ | Bỏ placeholder; dùng `.env` + `gitignore`; GitHub Secrets cho CI |
| Migration hỏng dữ liệu | Mất dữ liệu tài chính | Backup DB thủ công trước mỗi deploy; migration idempotent |
| VPS hết dung lượng (log, DB) | App ngừng hoạt động | Log rolling (đã có Serilog); cleanup định kỳ; alert Telegram nếu disk > 80% |
| Bot Telegram bị lợi dụng nếu lộ token | Người lạ nhập giao dịch | Giữ cơ chế `AuthorizedUserId` (đã có); đổi token nếu nghi ngờ |

---

## 7. Definition of Done

Một task **Done** khi:
- [ ] Code bám theo Clean Architecture (không phá vỡ lớp Domain).
- [ ] Có FluentValidation cho mọi Command có input người dùng.
- [ ] Có migration EF Core (nếu thay đổi schema) và chạy được.
- [ ] Có unit/integration test cho logic quan trọng (parser, handler, validation).
- [ ] `dotnet build` + `dotnet test` xanh; `npm run build` thành công.
- [ ] API trả lỗi chuẩn ProblemDetails (RFC 7807) khi có exception.
- [ ] README/docs được cập nhật nếu thay đổi hành vi.
- [ ] Không commit secret; dữ liệu nhạy cảm mã hóa at-rest.

---

## 8. Tech stack bổ sung (đề xuất khi cần)

| Mục đích | Công nghệ |
|---|---|
| Test | xUnit + FluentAssertions + Moq / NSubstitute |
| Export CSV | CsvHelper |
| Export PDF | QuestPDF |
| Mapping DTO | AutoMapper (nếu mapping tay quá nhiều) |
| Speech-to-text | Web Speech API (frontend, miễn phí) |

---

## 9. Quick Wins (bắt đầu ngay)

| Thứ tự | Việc | Lý do | Thời gian |
|---|---|---|---|
| 1 | **Phase 1.1 + 1.2 + 1.3** — sửa cấu hình bảo mật & đồng bộ DB | Nhanh nhất, giảm rủi ro lớn nhất (lộ key mã hóa) | 30 phút |
| 2 | **Phase 1.4** — test project cho parser | Bảo vệ tính năng "sống còn" (parse email ngân hàng) | 2-3 giờ |
| 3 | **Phase 1.7 + 1.8** — Category CRUD + nối frontend | Khép kín luồng nhập liệu, bỏ mock data | 3-4 giờ |
| 4 | **Phase 2.4** — Telegram Bot mở rộng | Tính năng dùng hằng ngày, tăng giá trị ngay | 2-3 giờ |