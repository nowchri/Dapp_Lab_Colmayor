"use client";

import { useState, useCallback } from "react";
import QRScanner from "@/components/QRScanner";
import toast from "react-hot-toast";

function getStoredCount(): number {
  try { return JSON.parse(localStorage.getItem("scannedBag") || "[]").length; }
  catch { return 0; }
}

export default function FabScanner() {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(getStoredCount);

  const handleScan = useCallback((code: string) => {
    if (!code || !code.trim()) return;
    const clean = code.trim();

    try {
      const existing = JSON.parse(localStorage.getItem("scannedBag") || "[]");
      if (!existing.includes(clean)) {
        existing.push(clean);
        localStorage.setItem("scannedBag", JSON.stringify(existing));
        setCount(existing.length);
        toast.success(`Escaneado! (${existing.length} en bolsa)`);
      } else {
        toast("Ya fue escaneado", { icon: "⚠️" });
      }
    } catch {
      toast.error("Error al guardar");
    }
  }, []);

  const handleClose = useCallback(() => {
    setShow(false);
    setCount(getStoredCount());
  }, []);

  return (
    <>
      {show && (
        <QRScanner
          onScan={handleScan}
          bagCount={count}
          onClose={handleClose}
        />
      )}
      {!show && (
        <button
          onClick={() => { setCount(getStoredCount()); setShow(true); }}
          className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-[#F7C800] text-[#09488D] shadow-[0_4px_20px_rgba(247,200,0,0.4)] hover:shadow-[0_6px_24px_rgba(247,200,0,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-2xl"
          title="Escanear QR"
        >
          📷
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#09488D] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </button>
      )}
    </>
  );
}