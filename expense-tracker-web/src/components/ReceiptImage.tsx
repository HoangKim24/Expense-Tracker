import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
import { getLocalReceipt } from "../lib/receiptStorage";

interface Props {
  src: string | null;
  path?: string | null;
  alt: string;
  className?: string;
}

export default function ReceiptImage({ src, path, alt, className = "w-full h-full object-cover" }: Props) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setCurrentSrc(src);
    setHasError(false);

    // Kiểm tra bản lưu dự phòng trong IndexedDB nếu không có src sẵn
    const lookupKey = path || src;
    if (lookupKey && !src) {
      getLocalReceipt(lookupKey).then((cached) => {
        if (isMounted && cached) {
          setCurrentSrc(cached);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [src, path]);

  const handleError = async () => {
    // Khi URL từ server trả về 404 (do Render khởi động lại xóa file /uploads)
    const lookupKey = path || src;
    if (lookupKey) {
      const cached = await getLocalReceipt(lookupKey);
      if (cached && cached !== currentSrc) {
        setCurrentSrc(cached);
        setHasError(false);
        return;
      }
    }
    setHasError(true);
  };

  const handleLoad = () => {
    setHasError(false);
  };

  if (!currentSrc || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80 p-3 text-center">
        <ImageIcon size={32} className="text-zinc-600 mb-1.5" />
        <span className="text-[11px] font-medium text-zinc-400">Ảnh hóa đơn</span>
        <span className="text-[9px] text-zinc-600 mt-0.5">Không tải được file</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      onLoad={handleLoad}
      className={className}
    />
  );
}
