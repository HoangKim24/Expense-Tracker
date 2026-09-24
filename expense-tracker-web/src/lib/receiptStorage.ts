/**
 * Client-Side Persistent IndexedDB Storage for Receipt Images
 * Đảm bảo ảnh hóa đơn chụp trên điện thoại không bao giờ bị mất
 * kể cả khi Render Free Tier khởi động lại và xóa thư mục /uploads tạm.
 */

const DB_NAME = "TExpenseReceiptsDB";
const STORE_NAME = "receipt_images";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu ảnh hóa đơn dạng Data URL hoặc Blob vào IndexedDB
 */
export async function saveLocalReceipt(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Could not save receipt to IndexedDB:", err);
  }
}

/**
 * Lấy ảnh hóa đơn lưu cục bộ trong IndexedDB
 */
export async function getLocalReceipt(key?: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Chuyển File ảnh thành Base64 Data URL để lưu trữ offline
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
