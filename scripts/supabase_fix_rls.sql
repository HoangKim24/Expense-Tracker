-- ==============================================================================
-- FIX SUPABASE WARNING: "Table public.Categories is public, but RLS has not been enabled"
-- Chạy đoạn script này trong: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Kích hoạt Row Level Security (RLS) cho cả hai bảng Categories và Transactions
ALTER TABLE IF EXISTS public."Categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Transactions" ENABLE ROW LEVEL SECURITY;

-- 2. Cho phép người dùng / ứng dụng đọc công khai danh mục chi tiêu (Categories)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'Categories' 
          AND policyname = 'Allow public read on Categories'
    ) THEN
        CREATE POLICY "Allow public read on Categories" 
        ON public."Categories" 
        FOR SELECT 
        USING (true);
    END IF;
END
$$;

-- 3. Bảng Transactions: Không cấp quyền cho 'anon' qua Supabase REST API
-- Chỉ tài khoản 'postgres' (Backend .NET 8 trên Render kết nối qua Connection String)
-- mới có quyền truy cập toàn bộ dữ liệu vì role 'postgres' mặc định có cờ BYPASSRLS.
-- Điều này bảo vệ 100% dữ liệu tài chính của bạn khỏi việc bị lộ qua public anon key.

-- Thông báo hoàn thành
SELECT 'RLS successfully enabled for Categories and Transactions' AS status;
