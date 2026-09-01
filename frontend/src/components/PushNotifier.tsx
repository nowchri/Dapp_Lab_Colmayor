"use client";

// PushNotifier — PWA: activa las notificaciones del celular (recordatorios de devolución).
// Muestra un banner discreto solo a usuarios logueados que aún no decidieron.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushNotifier() {
  const [visible, setVisible] = useState(false);
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    // Solo usuarios logueados y que no hayan decidido ya
    if (typeof window === "undefined") return;
    const logueado = document.cookie.includes("userRol=");
    if (!logueado) return;
    if (localStorage.getItem("pushDecision") === "si" || localStorage.getItem("pushDecision") === "no") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // Si ya tiene permiso, suscribirse silenciosamente
    if (Notification.permission === "granted") {
      suscribir().catch(() => {});
      return;
    }
    if (Notification.permission === "default") {
      // Mostrar banner tras 1.5s (discreto, esquina)
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  async function suscribir() {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) throw new Error("No se pudo guardar la suscripción");
    return sub;
  }

  async function activar() {
    setActivando(true);
    try {
      const perm = await Notification.requestPermission();
      // Siempre cerrar el banner al decidir (acepte o no)
      setVisible(false);
      if (perm === "granted") {
        localStorage.setItem("pushDecision", "si");
        await suscribir();
        toast.success("🔔 Notificaciones activadas — te avisaremos para devolver los préstamos");
      } else {
        localStorage.setItem("pushDecision", "no");
        toast("Notificaciones desactivadas — podés activarlas después", { icon: "🔕" });
      }
    } catch (e) {
      console.error("[push]", e);
      setVisible(false);
      // Si concedió permiso pero falló el guardado, reintentar solo la próxima carga
      if (Notification.permission !== "granted") {
        localStorage.setItem("pushDecision", "no");
      } else {
        toast.error("No se pudieron activar las notificaciones — reintentaremos luego");
      }
    } finally {
      setActivando(false);
    }
  }

  function cerrar() {
    localStorage.setItem("pushDecision", "no");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-iu-dark">¿Querés recordatorios?</p>
          <p className="text-xs text-iu-gray mt-1">
            Te avisamos en el celular cuándo devolver un préstamo y cuánto tiempo te queda. Podés instalar la app desde el menú del navegador.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={activar}
              disabled={activando}
              className="flex-1 bg-[#09488D] text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-[#073a6b] disabled:opacity-50 transition"
            >
              {activando ? "Activando..." : "Activar notificaciones"}
            </button>
            <button onClick={cerrar} className="text-xs text-iu-gray px-2 hover:underline">
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
