-- ==============================================================================
-- RESET / XÓA TOÀN BỘ DỮ LIỆU GIAO DỊCH TEST
-- Chạy script này trong: Supabase Dashboard -> SQL Editor -> Run
-- Lưu ý: Chỉ xóa các giao dịch (Transactions), GIỮ NGUYÊN các Danh mục (Categories)
-- ==============================================================================

-- 1. Xóa sạch toàn bộ bảng Transactions
TRUNCATE TABLE public."Transactions" CASCADE;

-- 2. Kiểm tra lại số lượng bản ghi (kết quả sẽ trả về 0)
SELECT COUNT(*) AS remaining_transactions FROM public."Transactions";
