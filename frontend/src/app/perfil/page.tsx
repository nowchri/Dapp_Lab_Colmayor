"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const AVATARS = [
  { id: "atom", label: "Atomo", svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="12" fill="#09488D"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(0 40 40)"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(60 40 40)"/><ellipse cx="40" cy="40" rx="32" ry="10" stroke="#F7C800" strokeWidth="2" transform="rotate(120 40 40)"/></svg>' },
  { id: "flask", label: "Matraz", svg: '<svg viewBox="0 0 80 80" fill="none"><path d="M30 10h20v20l12 35a5 5 0 01-4.5 7h-35a5 5 0 01-4.5-7l12-35V10z" stroke="#09488D" strokeWidth="3" fill="#F4F6F9"/><circle cx="40" cy="30" r="3" fill="#F7C800"/></svg>' },
  { id: "chip", label: "Microchip", svg: '<svg viewBox="0 0 80 80" fill="none"><rect x="15" y="15" width="50" height="50" rx="4" stroke="#09488D" strokeWidth="3" fill="none"/><rect x="27" y="27" width="26" height="26" rx="2" fill="#F7C800" opacity="0.3"/><path d="M40 10v10M40 60v10M10 40h10M60 40h10" stroke="#09488D" strokeWidth="2"/></svg>' },
  { id: "book", label: "Libro", svg: '<svg viewBox="0 0 80 80" fill="none"><rect x="10" y="15" width="25" height="50" rx="3" stroke="#09488D" strokeWidth="3" fill="none"/><rect x="35" y="15" width="25" height="50" rx="3" stroke="#09488D" strokeWidth="3" fill="none"/><line x1="22" y1="15" x2="22" y2="65" stroke="#F7C800" strokeWidth="2"/><line x1="47" y1="15" x2="47" y2="65" stroke="#F7C800" strokeWidth="2"/></svg>' },
  { id: "rocket", label: "Cohete", svg: '<svg viewBox="0 0 80 80" fill="none"><path d="M40 5L25 45h30L40 5z" fill="#09488D"/><rect x="34" y="45" width="12" height="10" rx="2" fill="#F7C800"/><path d="M30 65a10 10 0 0020 0" stroke="#09488D" strokeWidth="3"/><circle cx="40" cy="20" r="4" fill="#fff"/></svg>' },
  { id: "gear", label: "Engranaje", svg: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="18" stroke="#09488D" strokeWidth="4" fill="none"/><circle cx="40" cy="40" r="8" fill="#F7C800"/><path d="M40 12v8M40 60v8M12 40h8M60 40h8M20 20l6 6M54 54l6 6M54 26l-6 6M26 54l-6 6" stroke="#09488D" strokeWidth="3" strokeLinecap="round"/></svg>' },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarId] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre_completo: "", telefono: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data) => {
        setPerfil(data);
        setForm({ nombre_completo: data.nombre_completo || "", telefono: data.telefono || "" });
      })
      .catch(() => toast.error("Error al cargar perfil"))
      .finally(() => setLoading(false));

    setAvatarId(localStorage.getItem("avatarId") || "atom");
  }, []);

  function selectAvatar(id: string) {
    setAvatarId(id);
    localStorage.setItem("avatarId", id);
    toast.success("Avatar actualizado");
    // Force navbar to refresh avatar (dispatch custom event)
    window.dispatchEvent(new Event("avatarChanged"));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_completo: form.nombre_completo.trim(), telefono: form.telefono.trim() }),
      });
      if (res.ok) {
        setPerfil({ ...perfil, nombre_completo: form.nombre_completo.trim(), telefono: form.telefono.trim() });
        setEditing(false);
        toast.success("Perfil actualizado");
        // Update cookie so navbar shows new name
        document.cookie = `userName=${encodeURIComponent(form.nombre_completo.trim())}; path=/; max-age=${30 * 60}`;
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F4F6F9]"><p className="text-[#09488D]">Cargando...</p></div>;
  if (!perfil) return null;

  const selectedAvatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* PERFIL CARD */}
        <div className="relative overflow-hidden bg-white/80 backdrop-blur border border-white rounded-[14px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          {/* Fondo decorativo */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#09488D]/5 to-transparent" />

          {/* Avatar grande + iniciales */}
          <div className="relative flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#09488D] to-[#06244A] flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4 border-4 border-white"
              title="Toca para cambiar avatar"
            >
              <span dangerouslySetInnerHTML={{ __html: selectedAvatar.svg }} className="w-16 h-16" />
            </div>
            <h1 className="text-2xl font-bold text-[#09488D]">{perfil.nombre_completo}</h1>
            <span className="px-3 py-1 mt-1 text-xs font-medium bg-[#09488D]/10 text-[#09488D] rounded-full uppercase tracking-wide">
              {perfil.rol}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-[#F4F6F9] rounded-xl">
              <div className="text-2xl mb-1">📦</div>
              <p className="text-3xl font-bold text-[#09488D]">{parseInt(perfil.total_prestamos || "0")}</p>
              <p className="text-xs text-gray-500">Préstamos totales</p>
            </div>
            <div className="text-center p-4 bg-[#F4F6F9] rounded-xl">
              <div className="text-2xl mb-1">🏅</div>
              <p className="text-3xl font-bold text-green-600">{parseInt(perfil.devueltos || "0")}</p>
              <p className="text-xs text-gray-500">Devueltos</p>
            </div>
          </div>
        </div>

        {/* SELECTOR DE AVATAR */}
        <div className="bg-white/80 backdrop-blur border border-white rounded-[14px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <h2 className="font-bold text-[#09488D] mb-4">Elegir avatar</h2>
          <div className="grid grid-cols-3 gap-3">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAvatar(a.id)}
                className={`p-2 rounded-xl border-2 transition ${
                  avatarId === a.id ? "border-[#F7C800] bg-[#F7C800]/5" : "border-gray-200 hover:border-[#09488D]/30"
                }`}
                title={a.label}
              >
                <span dangerouslySetInnerHTML={{ __html: a.svg }} className="w-10 h-10 block mx-auto" />
                <p className="text-[10px] text-gray-500 mt-1 text-center">{a.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* EDITAR PERFIL */}
        <div className="bg-white/80 backdrop-blur border border-white rounded-[14px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          {!editing ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Correo</span>
                <span className="text-[#09488D] font-medium">{perfil.correo_institucional}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Codigo</span>
                <span className="text-[#09488D] font-medium">{perfil.codigo_estudiantil || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Telefono</span>
                <span className="text-[#09488D] font-medium">{perfil.telefono || "-"}</span>
              </div>
              <button onClick={() => setEditing(true)} className="btn-primary w-full mt-4 text-sm">
                Modificar perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <h2 className="font-bold text-[#09488D]">Editar perfil</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#09488D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#09488D]"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}