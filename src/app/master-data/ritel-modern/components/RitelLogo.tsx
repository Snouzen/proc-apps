"use client";

import React from "react";
import { Building2, ImageOff, Store } from "lucide-react";
import { measureLogoBounds, type LogoBounds } from "./ritelLogoBounds";
import { toWebpUrl } from "@/lib/webpUrl";

export type RitelLogoVariant = "card" | "preview" | "alias";

interface RitelLogoProps {
  src?: string | null;
  alt: string;
  variant?: RitelLogoVariant;
  /** Ikon fallback saat URL kosong. Default: Building2 untuk card/preview, Store untuk alias. */
  className?: string;
}

// Tinggi area & padding konsisten per varian. Gambar selalu object-contain
// di dalam area ini (tidak mengikuti ukuran intrinsik file).
const VARIANT_STYLES: Record<
  RitelLogoVariant,
  { box: string; icon: number }
> = {
  card: { box: "h-[94px] w-full px-4 pt-1 pb-3", icon: 40 },
  preview: { box: "h-16 w-full p-2", icon: 24 },
  alias: { box: "h-12 w-24 p-1.5 shrink-0", icon: 20 },
};

export default function RitelLogo({
  src,
  alt,
  variant = "card",
  className = "",
}: RitelLogoProps) {
  const [failed, setFailed] = React.useState(false);
  const [measured, setMeasured] = React.useState<{ url: string; bounds: LogoBounds } | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const rawUrl = (src ?? "").trim();
  const url = React.useMemo(() => toWebpUrl(rawUrl), [rawUrl]);
  const bounds = measured?.url === url ? measured.bounds : null;

  // Reset status error jika URL berubah
  React.useEffect(() => {
    setFailed(false);
  }, [url]);

  // Gambar hasil crop langsung ke <canvas> dari elemen <img> yang sudah dimuat
  // agar browser tidak melakukan request jaringan ke-2 / ke-3 untuk gambar yang sama.
  React.useEffect(() => {
    if (!bounds || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const cw = Math.max(1, Math.round(bounds.cropWidth));
    const ch = Math.max(1, Math.round(bounds.cropHeight));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (ctx && img.complete && img.naturalWidth > 0) {
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(
        img,
        bounds.x,
        bounds.y,
        bounds.cropWidth,
        bounds.cropHeight,
        0,
        0,
        cw,
        ch
      );
    }
  }, [bounds]);

  const { box, icon } = VARIANT_STYLES[variant];
  const FallbackIcon = variant === "alias" ? Store : Building2;

  return (
    <div
      className={`${box} flex items-center justify-center min-w-0 ${className}`}
    >
      {url && !failed ? (
        <div className="h-full w-full min-w-0">
          {bounds && (
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={alt}
              className="block w-full h-full object-contain object-center"
            />
          )}
          <img
            ref={imgRef}
            key={url}
            src={url}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              const imgEl = e.currentTarget;
              void measureLogoBounds(url, imgEl).then((result) => {
                setMeasured(result ? { url, bounds: result } : null);
              });
            }}
            onError={() => setFailed(true)}
            className={
              bounds
                ? "hidden"
                : "block w-full h-full object-contain object-center"
            }
          />
        </div>
      ) : url && failed ? (
        <div
          className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-600"
          title="Logo gagal dimuat"
        >
          <ImageOff size={icon} />
          {variant !== "alias" && (
            <span className="text-[9px] font-bold uppercase tracking-wider">
              Logo gagal dimuat
            </span>
          )}
        </div>
      ) : (
        <FallbackIcon
          size={icon}
          className="text-slate-300 dark:text-slate-600 opacity-60"
        />
      )}
    </div>
  );
}
