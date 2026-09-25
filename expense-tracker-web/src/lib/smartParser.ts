import { TransactionSource, type TransactionSourceValue, type CategoryDto } from "./api";

export interface ParsedTransaction {
  amount: number | null;
  merchant: string;
  description: string;
  source: TransactionSourceValue;
  detectedCategoryName: string | null;
}

// Từ khóa để tự động nhận diện danh mục
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Ăn uống": ["cơm", "bún", "phở", "bánh mì", "lẩu", "nướng", "ăn", "thịt", "cá", "mì", "pizza", "kfc", "lotteria", "jollibee", "mcdonald", "sushi", "buffet", "quán ăn", "nhà hàng"],
  "Cà phê": ["cà phê", "cafe", "coffee", "highlands", "starbucks", "phúc long", "the coffee house", "trà sữa", "koi", "gong cha", "trà", "sinh tố", "nước ép", "katinat", "cheese coffee", "chè"],
  "Di chuyển": ["grab", "be", "gojek", "xăng", "đổ xăng", "xe buýt", "bus", "taxi", "mai linh", "vinasun", "gửi xe", "vé xe", "bãi xe", "vé máy bay", "tàu hỏa", "rửa xe"],
  "Mua sắm": ["shopee", "lazada", "tiki", "sendo", "quần áo", "giày", "dép", "siêu thị", "coopmart", "winmart", "bách hóa", "tiện lợi", "circle k", "ministop", "7-eleven", "familymart", "uniqlo", "zara"],
  "Sinh hoạt": ["tiền điện", "tiền nước", "tiền nhà", "wifi", "internet", "viettel", "vinaphone", "mobifone", "nạp tiền điện thoại", "chung cư", "phí quản lý", "gas"],
  "Giải trí": ["phim", "cgv", "lotte cinema", "bhd", "netflix", "spotify", "game", "steam", "karaoke", "du lịch", "vé xem", "sách", "truyện"],
};

/**
 * Phân tích chuỗi văn bản sao chép từ thông báo biến động số dư hoặc màn hình thanh toán
 * Hỗ trợ MoMo, Cake, Vietcombank, MB Bank, Techcombank, ACB, VPBank, TPBank...
 */
export function parseTransactionText(text: string): ParsedTransaction {
  const cleanText = text.trim();
  let amount: number | null = null;
  let merchant = "";
  let source: TransactionSourceValue = TransactionSource.Manual;

  // 1. Nhận diện Nguồn giao dịch
  const lowerText = cleanText.toLowerCase();
  if (lowerText.includes("momo")) {
    source = TransactionSource.MoMo;
  } else if (lowerText.includes("cake") || lowerText.includes("vpbank")) {
    source = TransactionSource.Cake;
  }

  // 2. Tìm số tiền bằng Regex
  // Hỗ trợ các định dạng: "45,000 VND", "45.000đ", "-50.000", "so tien: 120,000", "giao dich 75k"
  const amountPatterns = [
    /(?:số tiền|giao dịch|thanh toán|chuyển khoản|biến động|tiền ra|đã trừ|trừ|-)\s*:?\s*([0-9]{1,3}(?:[.,][0-9]{3})*)\s*(?:vnd|vnđ|đ)?/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:vnd|vnđ|đ)/i,
    /([0-9]+)\s*k\b/i,
    /([0-9]{4,9})\s*(?:vnd|vnđ|đ)?/i,
  ];

  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      if (pattern.source.includes("k\\b")) {
        // Định dạng k (ví dụ: 45k -> 45000)
        amount = parseInt(match[1], 10) * 1000;
      } else {
        // Chuẩn hóa dấu chấm/phẩy thành số nguyên
        const rawDigits = match[1].replace(/[.,]/g, "");
        const parsed = parseInt(rawDigits, 10);
        if (!isNaN(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }
  }

  // 3. Tìm nơi nhận / Merchant / Nội dung
  // Mẫu: "tại THE COFFEE HOUSE", "đến NGUYEN VAN A", "cho HIGHLANDS", "nội dung: Cơm trưa"
  const merchantPatterns = [
    /(?:tại|cho|đến|người nhận|đơn vị chấp nhận thanh toán)\s*:?\s*([^,.\n\r]+)/i,
    /(?:nội dung|lý do|nd|ghi chú)\s*:?\s*([^,.\n\r]+)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Lọc bỏ các từ thừa như "lúc", "vào ngày"
      const cutMatch = candidate.split(/\s+(?:lúc|vào|ngày|thành công|qua)\b/i)[0];
      merchant = cutMatch.trim();
      break;
    }
  }

  // Nếu không tách được merchant, lấy toàn bộ hoặc dòng đầu tiên làm description
  const description = merchant ? merchant : cleanText.slice(0, 45);

  // 4. Đoán danh mục theo từ khóa
  const detectedCategoryName = detectCategoryFromText(lowerText);

  return {
    amount,
    merchant,
    description,
    source,
    detectedCategoryName,
  };
}

/**
 * Tự động đoán tên danh mục dựa trên từ khóa trong ghi chú hoặc nội dung
 */
export function detectCategoryFromText(text: string): string | null {
  const lower = text.toLowerCase();

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return catName;
      }
    }
  }

  return null;
}

/**
 * Tìm ID danh mục trong danh sách CategoryDto khớp với tên danh mục được đoán
 */
export function matchCategoryId(
  suggestedName: string | null,
  categories: CategoryDto[]
): string | null {
  if (!suggestedName || categories.length === 0) return null;

  const found = categories.find(
    (c) =>
      c.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
      suggestedName.toLowerCase().includes(c.name.toLowerCase())
  );

  return found ? found.id : null;
}
