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
 * Xóa ảnh hóa đơn khỏi IndexedDB khi giao dịch bị xóa để tránh rác bộ nhớ cục bộ
 */
export async function deleteLocalReceipt(key?: string | null): Promise<void> {
  if (!key) return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      // Xóa theo key trực tiếp
      store.delete(key);

      // Nếu là URL tuyệt đối, dọn luôn pathname và filename
      try {
        if (key.startsWith("http://") || key.startsWith("https://")) {
          const parsed = new URL(key);
          store.delete(parsed.pathname);
          const fileName = parsed.pathname.split("/").pop();
          if (fileName) store.delete(fileName);
        }
      } catch {
        // Bỏ qua nếu URL không hợp lệ
      }

      // Nếu key có dạng /uploads/xxx.jpg
      const fileName = key.split("/").pop();
      if (fileName && fileName !== key) {
        store.delete(fileName);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // IndexedDB safe fallback
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
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as string);
          return;
        }

        // Thử tìm theo URL pathname nếu key là URL tuyệt đối
        try {
          if (key.startsWith("http://") || key.startsWith("https://")) {
            const parsed = new URL(key);
            const pathReq = store.get(parsed.pathname);
            pathReq.onsuccess = () => {
              if (pathReq.result) {
                resolve(pathReq.result as string);
              } else {
                // Thử tìm theo tên file cuối cùng
                const fileName = parsed.pathname.split("/").pop();
                if (fileName) {
                  const fileReq = store.get(fileName);
                  fileReq.onsuccess = () => resolve((fileReq.result as string) || null);
                  fileReq.onerror = () => resolve(null);
                } else {
                  resolve(null);
                }
              }
            };
            pathReq.onerror = () => resolve(null);
            return;
          }
        } catch {
          // Bỏ qua nếu URL không hợp lệ
        }

        // Nếu key là /uploads/xxx.jpg, thử tìm theo filename xxx.jpg
        const fileName = key.split("/").pop();
        if (fileName && fileName !== key) {
          const fileReq = store.get(fileName);
          fileReq.onsuccess = () => resolve((fileReq.result as string) || null);
          fileReq.onerror = () => resolve(null);
          return;
        }

        resolve(null);
      };
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
