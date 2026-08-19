"use client";

import { useState, useCallback } from "react";
import QRScanner from "@/components/QRScanner";
import toast from "react-hot-toast";

function getStoredCount(): number {
  try { return JSON.parse(localStorage.getItem("scannedBag") || "[]").length; } catch { return 0; }
}

export default function FabScanner() {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(getStoredCount);

  const handleScan = useCallback((code: string) => {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem("scannedBag") || "[]");
      if (existing.includes(code)) {
        toast("Ya fue escaneado", { icon: "⚠️" });
        return;
      }
      existing.push(code);
      localStorage.setItem("scannedBag", JSON.stringify(existing));
      setCount(existing.length);
      toast.success(`Escaneado! (${existing.length} en bolsa)`);

      // Dispatch custom event so pages can pick up new items live
      window.dispatchEvent(new CustomEvent("scannedItemsChanged"));
    } catch { toast.error("Error al guardar"); }
  }, []);

  // Update count when localStorage changes externally
  const handleOpen = useCallback(() => {
    setCount(getStoredCount());
    setShow(true);
  }, []);

  if (!show) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#F7C800] hover:bg-amber-400 text-[#09488D] rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-105"
        title="Escanear QR"
      >
        <span>📷</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <QRScanner
      onScan={handleScan}
      bagCount={count}
      onClose={() => { setShow(false); setCount(getStoredCount()); }}
    />
  );
}