"use client";

import { 
  Upload, 
  ImageIcon, 
  Download, 
  RefreshCcw, 
  Scissors, 
  Maximize,
  Check,
  AlertCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";

export default function ImageLabPage() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [processedIcon, setProcessedIcon] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Format Salah', text: 'Tolong upload file gambar (PNG/JPG/WEBP).' });
      return;
    }
    setFileName(file.name.split('.')[0]);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setProcessedLogo(null);
      setProcessedIcon(null);
    };
    reader.readAsDataURL(file);
  };

  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    let bound = { top: -1, left: -1, right: -1, bottom: -1 };
    let x, y, i;

    for (i = 0; i < l; i += 4) {
      // Check if pixel is not transparent AND not pure white
      // (Handling both transparent PNGs and JPGs with white backgrounds)
      const isTransparent = pixels.data[i + 3] === 0;
      const isWhite = pixels.data[i] > 250 && pixels.data[i + 1] > 250 && pixels.data[i + 2] > 250;
      
      if (!isTransparent && !isWhite) {
        x = (i / 4) % canvas.width;
        y = Math.floor((i / 4) / canvas.width);

        if (bound.top === -1 || y < bound.top) bound.top = y;
        if (bound.left === -1 || x < bound.left) bound.left = x;
        if (x > bound.right) bound.right = x;
        if (y > bound.bottom) bound.bottom = y;
      }
    }

    if (bound.top === -1) return canvas; // Empty image

    const trimHeight = bound.bottom - bound.top + 1;
    const trimWidth = bound.right - bound.left + 1;
    const trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    const copy = document.createElement('canvas');
    copy.width = trimWidth;
    copy.height = trimHeight;
    const copyCtx = copy.getContext('2d');
    copyCtx?.putImageData(trimmed, 0, 0);

    return copy;
  };

  const processImages = async () => {
    if (!image) return;
    setIsProcessing(true);
    
    try {
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      // First, draw to a temp canvas to trim it
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
      }
      
      const trimmedCanvas = trimCanvas(tempCanvas);
      const tw = trimmedCanvas.width;
      const th = trimmedCanvas.height;

      // 1. Process Logo (Standardized for Card: 400x130, object-fit contain)
      const logoCanvas = document.createElement('canvas');
      const logoCtx = logoCanvas.getContext('2d');
      logoCanvas.width = 400;
      logoCanvas.height = 130;
      
      if (logoCtx) {
        logoCtx.clearRect(0, 0, 400, 130);
        const ratio = Math.min(400 / tw, 130 / th);
        const nw = tw * ratio;
        const nh = th * ratio;
        const nx = (400 - nw) / 2;
        const ny = (130 - nh) / 2;
        logoCtx.drawImage(trimmedCanvas, nx, ny, nw, nh);
        setProcessedLogo(logoCanvas.toDataURL('image/png'));
      }

      // 2. Process Icon (Square Rounded: 200x200)
      const iconCanvas = document.createElement('canvas');
      const iconCtx = iconCanvas.getContext('2d');
      iconCanvas.width = 200;
      iconCanvas.height = 200;
      
      if (iconCtx) {
        iconCtx.clearRect(0, 0, 200, 200);
        const size = Math.min(tw, th);
        const sx = (tw - size) / 2;
        const sy = (th - size) / 2;
        iconCtx.drawImage(trimmedCanvas, sx, sy, size, size, 0, 0, 200, 200);
        setProcessedIcon(iconCanvas.toDataURL('image/png'));
      }

      Swal.fire({
        icon: 'success',
        title: 'Konversi Berhasil!',
        text: 'Gambar sudah siap di-download.',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'rounded-[32px]' }
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat memproses gambar.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (dataUrl: string, suffix: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileName}-${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12 space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
            <ImageIcon size={30} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Image Lab</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Aset Visual & Logo Optimizer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left: Upload Zone */}
        <div className="space-y-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50/50'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/50'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/50');
              const file = e.dataTransfer.files?.[0];
              if (file) loadImage(file);
            }}
            className={`relative group cursor-pointer border-3 border-dashed rounded-[48px] p-12 transition-all duration-500 flex flex-col items-center justify-center text-center space-y-6 ${image ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${image ? 'bg-emerald-500 text-white scale-110 shadow-xl shadow-emerald-200' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-12'}`}>
              {image ? <Check size={36} strokeWidth={3} /> : <Upload size={36} strokeWidth={2.5} />}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {image ? 'Ganti Gambar' : 'Upload Logo Ritel'}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-8">
                Seret file ke sini atau klik untuk memilih gambar mentah (PNG/JPG)
              </p>
            </div>

            {image && (
              <div className="pt-4 flex items-center gap-3">
                <span className="px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-in zoom-in">
                  File Terdeteksi
                </span>
              </div>
            )}
          </div>

          {image && (
            <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-8 duration-700">
              <button 
                onClick={processImages}
                disabled={isProcessing}
                className="flex-[2] h-18 bg-indigo-600 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {isProcessing ? (
                  <RefreshCcw size={20} className="animate-spin" />
                ) : (
                  <Maximize size={20} strokeWidth={3} />
                )}
                {isProcessing ? 'Memproses...' : 'Proses Gambar Sekarang'}
              </button>

              <button 
                onClick={() => {
                  setImage(null);
                  setFileName("");
                  setProcessedLogo(null);
                  setProcessedIcon(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isProcessing}
                className="flex-1 h-18 bg-white border-2 border-slate-100 text-slate-400 rounded-[28px] font-black uppercase tracking-[0.2em] text-sm hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
              >
                <RefreshCcw size={20} strokeWidth={3} />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Right: Previews */}
        <div className="space-y-12">
          {!image ? (
            <div className="h-[500px] bg-white rounded-[48px] border border-slate-100 flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                <AlertCircle size={32} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic max-w-[250px] leading-relaxed">
                Belum ada data visual. Silakan upload logo mentah di panel kiri untuk memulai proses konversi.
              </p>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-1000">
              {/* Logo Card Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Standar Card Logo (400x130)</h4>
                  {processedLogo && (
                    <button onClick={() => downloadImage(processedLogo, 'logo')} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline">
                      <Download size={12} /> Download
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl overflow-hidden relative group">
                  <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '15px 15px' }}></div>
                  <div className="h-[130px] w-full flex items-center justify-center border border-dashed border-slate-100 rounded-2xl relative z-10">
                    {processedLogo ? (
                      <img src={processedLogo} className="max-h-full max-w-full object-contain drop-shadow-lg" alt="Logo Preview" />
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase italic">Klik tombol proses...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Icon Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">2. Rounded Icon (Square)</h4>
                  {processedIcon && (
                    <button onClick={() => downloadImage(processedIcon, 'icon')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline">
                      <Download size={12} /> Download
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl flex items-center justify-center gap-12">
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-indigo-50 shadow-inner flex items-center justify-center bg-slate-50">
                        {processedIcon ? (
                          <img src={processedIcon} className="w-full h-full object-cover" alt="Icon Preview" />
                        ) : (
                          <Scissors size={24} className="text-slate-200" />
                        )}
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Icon Style</span>
                   </div>

                   <div className="flex-1 space-y-3">
                      <div className="h-2 bg-slate-50 rounded-full w-24"></div>
                      <div className="h-2 bg-slate-50 rounded-full w-full"></div>
                      <div className="h-2 bg-slate-50 rounded-full w-2/3"></div>
                      <p className="text-[9px] font-bold text-slate-400 leading-relaxed italic pt-2">
                        Icon ini dipotong kotak (center-crop) dan dioptimasi untuk favicon atau profil brand.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
