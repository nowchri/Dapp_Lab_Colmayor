"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (code: string) => void;
  bagCount: number;
  onClose: () => void;
}

export default function QRScanner({ onScan, bagCount, onClose }: Props) {
  const [error, setError] = useState("");
  const [lastScan, setLastScan] = useState("");

  useEffect(() => {
    let cancelled = false;
    let scanner: any = null;

    import("html5-qrcode").then((module) => {
      if (cancelled) return;
      const Html5Qrcode = module.Html5Qrcode;
      scanner = new Html5Qrcode("qr-reader");

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 5, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            const clean = decodedText.trim();
            setLastScan(clean);
            onScan(clean);
          },
          () => {}
        )
        .catch((err: any) => {
          setError("No se pudo acceder a la camara: " + (err?.message || err));
        });
    });

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-[#09488D] text-lg">Escanear QR</h2>
            <p className="text-xs text-slate-400">
              {lastScan ? `Ultimo: ${lastScan}` : "Apuntá al código QR del activo"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="pill-primary text-xs">{bagCount} items</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        <div className="relative bg-black">
          {error ? (
            <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
          ) : (
            <>
              <div id="qr-reader" className="w-full aspect-square" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[250px] h-[250px] border-2 border-[#F7C800] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            </>
          )}
        </div>

        <div className="p-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cerrar</button>
          <button
            onClick={() => window.location.href = "/prestamos/nuevo"}
            className="btn-primary flex-1 text-sm"
          >
            Ir a la bolsa ({bagCount})
          </button>
        </div>
      </div>
    </div>
  );
}