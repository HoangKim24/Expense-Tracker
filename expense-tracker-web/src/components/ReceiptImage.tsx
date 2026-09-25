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
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Ảnh hiển thị ưu tiên: fallbackSrc nếu có lỗi từ server, nếu không thì dùng src ban đầu
  const activeSrc = fallbackSrc || src;

  useEffect(() => {
    let isMounted = true;
    const lookupKey = path || src;
    if (lookupKey && (!src || lookupKey.includes("local_") || lookupKey.startsWith("data:"))) {
      getLocalReceipt(lookupKey).then((cached) => {
        if (isMounted && cached) {
          setFallbackSrc(cached);
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
      if (cached && cached !== fallbackSrc) {
        setFallbackSrc(cached);
        setHasError(false);
        return;
      }
    }
    setHasError(true);
  };

  const handleLoad = () => {
    setHasError(false);
  };

  if (!activeSrc || hasError) {
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
      src={activeSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      onLoad={handleLoad}
      className={className}
    />
  );
}
