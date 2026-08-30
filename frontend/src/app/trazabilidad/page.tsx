"use client";

import { useEffect, useState, useCallback } from "react";

interface Eslabon {
  id_registro: number;
  tipo: "loan" | "return";
  estado: string;
  ubicacion: string;
  asset_hash: string;
  loan_hash: string;
  student_hash: string;
  monitor_hash: string;
  hash_registro: string;
  prev_hash: string | null;
  fecha: string;
  nombre_activo: string | null;
  estudiante_nombre: string | null;
  monitor_nombre: string | null;
}

const LIMITE = 25;

/** Edad relativa estilo explorador de bloques. */
function edad(fecha: string): string {
  const ms = Date.now() - new Date(fecha).getTime();
  if (ms < 60_000) return "segundos";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} h`;
  return `${Math.floor(ms / 86_400_000)} d`;
}

function Hash({ valor, corto = 10 }: { valor: string; corto?: number }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 whitespace-nowrap">
      {valor.length > corto ? `${valor.slice(0, corto)}…` : valor}
      <button
        onClick={async (e) => {
          e.stopPropagation();
          try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch {}
        }}
        title="Copiar hash"
        className="shrink-0 text-[#09488D] hover:bg-[#09488D]/10 rounded p-0.5 transition"
      >
        {copiado ? <span className="text-emerald-600 font-bold">✓</span> : "📋"}
      </button>
    </span>
  );
}

function BadgeEstado({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-slate-300">—</span>;
  const cls = estado === "disponible" ? "bg-green-100 text-green-700"
    : estado === "prestado" ? "bg-blue-100 text-blue-700"
    : estado === "dañado" ? "bg-rose-100 text-rose-700"
    : "bg-amber-100 text-amber-700";
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${cls}`}>{estado}</span>;
}

function FilaTabla({ es }: { es: Eslabon }) {
  const [abierto, setAbierto] = useState(false);
  const from = es.estudiante_nombre || (es.student_hash ? <Hash valor={es.student_hash} /> : "—");
  const to = es.monitor_nombre || (es.monitor_hash ? <Hash valor={es.monitor_hash} /> : "—");

  return (
    <>
      <tr
        onClick={() => setAbierto(!abierto)}
        className="border-b border-gray-100 hover:bg-[#F4F6F9]/70 cursor-pointer transition"
      >
        <td className="px-3 py-2.5">
          <Hash valor={es.hash_registro} />
        </td>
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${es.tipo === "loan" ? "bg-[#09488D]/10 text-[#09488D]" : "bg-emerald-100 text-emerald-700"}`}>
            {es.tipo === "loan" ? "📦 Préstamo" : "✅ Devolución"}
          </span>
        </td>
        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">#{es.id_registro}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{edad(es.fecha)}</td>
        <td className="px-3 py-2.5 text-sm text-slate-700 max-w-[180px] truncate" title={es.estudiante_nombre || ""}>{from}</td>
        <td className="px-3 py-2.5 text-sm text-slate-700 max-w-[180px] truncate" title={es.monitor_nombre || ""}>{to}</td>
        <td className="px-3 py-2.5 text-sm font-medium text-slate-800 max-w-[200px] truncate" title={es.nombre_activo || ""}>
          {es.nombre_activo || (es.asset_hash ? <Hash valor={es.asset_hash} /> : "—")}
        </td>
        <td className="px-3 py-2.5"><BadgeEstado estado={es.estado} /></td>
        <td className="px-3 py-2.5 text-xs text-slate-500">{es.ubicacion || "—"}</td>
        <td className="px-3 py-2.5 text-center">
          <span className={`inline-block text-slate-300 transition-transform ${abierto ? "rotate-180" : ""}`}>▼</span>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-[#F4F6F9]/60 border-b border-gray-100">
          <td colSpan={10} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Transaction Hash</span><Hash valor={es.hash_registro} corto={66} /></p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Fecha</span>{new Date(es.fecha).toLocaleString("es-CO")}</p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Loan Hash</span><Hash valor={es.loan_hash} corto={66} /></p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Estudiante</span>{es.estudiante_nombre || "—"} {es.student_hash && <Hash valor={es.student_hash} />}</p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Asset Hash</span><Hash valor={es.asset_hash} corto={66} /></p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Monitor</span>{es.monitor_nombre || "—"} {es.monitor_hash && <Hash valor={es.monitor_hash} />}</p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Prev Hash</span>{es.prev_hash ? <Hash valor={es.prev_hash} corto={66} /> : <span className="text-slate-300">(génesis)</span>}</p>
              <p className="text-slate-500"><span className="font-semibold text-slate-400 uppercase text-[10px] mr-2">Estado</span>{es.estado || "—"} {es.ubicacion ? `· ${es.ubicacion}` : ""}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TrazabilidadPage() {
  const [rol, setRol] = useState("");
  const [items, setItems] = useState<Eslabon[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [cadenaOk, setCadenaOk] = useState<boolean | null>(null);
  const [totalEslabones, setTotalEslabones] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (page: number, q: string) => {
    setLoading(true);
    try {
      const url = `/api/blockchain/cadena?page=${page}&limit=${LIMITE}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.items || []);
      setTotal(d.total || 0);
      setCadenaOk(d.cadena_ok);
      setTotalEslabones(d.total_eslabones || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const c = document.cookie.split("; ").find(r => r.startsWith("userRol="));
    if (c) setRol(c.split("=")[1]);
  }, []);

  useEffect(() => { cargar(pagina, busqueda); }, [pagina, busqueda, cargar]);

  if (rol !== "admin") {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="card-glass text-center py-12 px-8 text-slate-400">
          <p className="text-4xl mb-3">🔒</p>
          <p>Solo los administradores pueden ver el libro de trazabilidad.</p>
        </div>
      </div>
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));
  const inicio = total === 0 ? 0 : (pagina - 1) * LIMITE + 1;
  const fin = Math.min(pagina * LIMITE, total);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-[#09488D]">🔗 Libro de Trazabilidad</h1>
            {cadenaOk !== null && (
              cadenaOk ? (
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  🔒 Cadena íntegra · {totalEslabones} eslabones
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
                  🚨 ¡Cadena ROTA! Un registro del pasado fue alterado
                </span>
              )
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Historial inmutable: cada eslabón guarda el hash del anterior. Alterar un dato pasado rompe la cadena.
          </p>
          <input
            type="text"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por activo o estudiante..."
            className="input-glass max-w-md mt-4"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 px-4 md:px-6">
        <div className="card-white overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-4xl mb-3">⛓️</p>
              <p>No hay eslabones todavía. Aprobá un préstamo para verlo aquí.</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[10px] text-slate-400 uppercase tracking-wide">
                  <th className="px-3 py-2.5">Hash</th>
                  <th className="px-3 py-2.5">Método</th>
                  <th className="px-3 py-2.5">Eslabón</th>
                  <th className="px-3 py-2.5">Edad</th>
                  <th className="px-3 py-2.5">From (Estudiante)</th>
                  <th className="px-3 py-2.5">To (Monitor)</th>
                  <th className="px-3 py-2.5">Activo</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Ubicación</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(es => <FilaTabla key={es.id_registro} es={es} />)}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">
            {total === 0 ? "0 registros" : `Mostrando ${inicio}–${fin} de ${total} eslabones`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-[#09488D] hover:bg-[#09488D] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Página anterior"
            >❮</button>
            <span className="text-sm font-semibold text-[#09488D]">Página {pagina} de {totalPaginas}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-[#09488D] hover:bg-[#09488D] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Página siguiente"
            >❯</button>
          </div>
        </div>
      </div>
    </div>
  );
}
