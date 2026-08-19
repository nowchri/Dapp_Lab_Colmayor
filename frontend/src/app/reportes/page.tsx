"use client";

import { useEffect, useState } from "react";

interface Stats {
  total_activos: number; disponibles: number; prestados: number; danados: number;
  prestamos_activos: number; devueltos: number; en_mora: number;
  total_trazables: number; total_consumibles: number;
  trazables_prestados: number; consumibles_prestados: number;
}

function DonutRing({ value, total, color, label, sublabel }: { value: number; total: number; color: string; label: string; sublabel: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      <p className="text-xs text-slate-400">{value} de {total} {sublabel}</p>
    </div>
  );
}

function ProgressBar({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{value}/{total}</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}


function BarChart({ trazables, consumibles, tPrestados, cPrestados }: { trazables: number; consumibles: number; tPrestados: number; cPrestados: number }) {
  const max = Math.max(trazables, consumibles, 1);
  const tPct = Math.round((tPrestados / max) * 100);
  const cPct = Math.round((cPrestados / max) * 100);
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600">Trazables (QR)</span>
          <span className="font-medium text-[#09488D]">{tPrestados} de {trazables}</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#09488D] rounded-full" style={{ width: tPct + '%' }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600">Consumibles (Sin stock)</span>
          <span className="font-medium text-amber-600">{cPrestados} de {consumibles}</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: cPct + '%' }} />
        </div>
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/stats").then(r => r.json()).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return null;

  const total = stats.total_activos || 1;
  const prestados = stats.prestados || 0;
  const danados = stats.danados || 0;
  const disponibles = stats.disponibles || 0;
  const mantenimiento = total - disponibles - prestados - danados;
  const enMora = stats.en_mora || 0;
  const devueltos = stats.devueltos || 0;

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#09488D]">📊 Reportes y Analíticas</h1>
            <span className="pill-primary">Admin</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Panel de control académico para seguimiento de inventario y préstamos del laboratorio.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 px-6 space-y-6">

        {/* ─── SECTION 1: Asset Status Donuts ─── */}
        <div className="card-glass">
          <h2 className="font-bold text-[#09488D] mb-4">📦 Estado de los Activos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DonutRing value={disponibles} total={total} color="#10b981" label="Disponibles" sublabel="activos listos" />
            <DonutRing value={prestados} total={total} color="#09488D" label="Prestados" sublabel="en circulación" />
            <DonutRing value={danados} total={total} color="#ef4444" label="Dañados" sublabel="requieren atención" />
            <DonutRing value={mantenimiento} total={total} color="#F7C800" label="Mantenimiento" sublabel="en reparación" />
          </div>
        </div>

        {/* ─── SECTION 2: Loan Analytics ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* KPI Blocks */}
          <div className="card-glass space-y-4">
            <h2 className="font-bold text-[#09488D]">📋 Métricas de Préstamos</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#09488D]/5 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#09488D]">{stats.prestamos_activos}</p>
                <p className="text-xs text-slate-500 mt-1">Préstamos activos</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{devueltos}</p>
                <p className="text-xs text-slate-500 mt-1">Devueltos</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-rose-600">{enMora}</p>
                <p className="text-xs text-slate-500 mt-1">En mora</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{danados}</p>
                <p className="text-xs text-slate-500 mt-1">Activos dañados</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <ProgressBar value={devueltos} total={stats.devueltos + stats.prestamos_activos + enMora || 1} color="#10b981" label="Tasa de devolución" />
              <ProgressBar value={enMora} total={stats.prestamos_activos || 1} color="#ef4444" label="Tasa de morosidad" />
              <ProgressBar value={danados} total={total} color="#F7C800" label="Tasa de daños" />
            </div>
          </div>

          {/* Untracked Stock & Blockchain */}
          <div className="space-y-4">
            <div className="card-glass space-y-3">
              <h2 className="font-bold text-[#09488D]">📡 Stock Controlado vs Sin Control</h2>
              <p className="text-xs text-slate-400">Comparativa de activos prestados: los trazables usan QR para trazabilidad completa. Los consumibles se prestan por stock y no pueden rastrearse individualmente.</p>
              <BarChart
                trazables={stats.total_trazables || 0}
                consumibles={stats.total_consumibles || 0}
                tPrestados={stats.trazables_prestados || 0}
                cPrestados={stats.consumibles_prestados || 0}
              />
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#09488D]" /> Trazables</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Consumibles</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">⚠️ Los consumibles prestados no se pueden rastrear individualmente. Se recomienda mantener un control manual del stock restante.</p>
            </div>

            <div className="card-glass space-y-3">
              <h2 className="font-bold text-[#09488D]">⛓️ Blockchain Tracker</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Red</span>
                  <span className="font-mono text-[#09488D] font-medium">Polygon Amoy Testnet</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Contrato</span>
                  <span className="font-mono text-xs text-slate-600">0x8f8ed9...c6</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Wallet</span>
                  <span className="font-mono text-xs text-slate-600">0x5d0A0f...aF</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Estado</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Operativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: Export ─── */}
        {/* ─── Download buttons ─── */}
        <div className="card-glass">
          <h2 className="font-bold text-[#09488D] mb-4">📥 Descargar Reportes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 gap-3">
            <a
              href="/api/reports/excel"
              className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition group"
            >
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-emerald-700 text-sm">Inventario Excel</p>
                <p className="text-xs text-emerald-500">Todos los activos en formato CSV</p>
              </div>
            </a>

            <a
              href="/api/reports/danados"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition group"
            >
              <span className="text-2xl">🔴</span>
              <div>
                <p className="font-semibold text-rose-700 text-sm">Activos Dañados PDF</p>
                <p className="text-xs text-rose-500">Listado para imprimir (Ctrl+P)</p>
              </div>
            </a>

            <a
              href="/api/reports/morosos"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition group"
            >
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-amber-700 text-sm">Estudiantes en Mora PDF</p>
                <p className="text-xs text-amber-500">Listado para imprimir (Ctrl+P)</p>
              </div>
            </a>
          </div>

          <a
            href="/api/reports/qr-sheet"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 p-4 rounded-xl border border-[#09488D]/30 bg-[#09488D]/5 hover:bg-[#09488D]/10 transition group"
          >
            <span className="text-2xl">🏷️</span>
            <div>
              <p className="font-semibold text-[#09488D] text-sm">Stickers QR (Todo el inventario)</p>
              <p className="text-xs text-[#09488D]/70">Hoja imprimible para pegar en cada activo</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}