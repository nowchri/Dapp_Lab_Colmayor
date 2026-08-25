"use client";

interface BlockchainProgressProps {
  open: boolean;
  title: string;
  steps: string[];
  currentStep: number; // -1 = error, steps.length = completo
  error?: string | null;
  hash?: string | null; // hashes separados por coma
  onClose: () => void;
}

function HashLink({ hash, index }: { hash: string; index: number }) {
  const url = `https://amoy.polygonscan.com/tx/${hash}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="font-mono text-[11px] text-[#09488D] underline break-all hover:text-[#073a6b]">
      Tx #{index + 1}: {hash.slice(0, 18)}…{hash.slice(-6)}
    </a>
  );
}

export default function BlockchainProgress({
  open, title, steps, currentStep, error, hash, onClose,
}: BlockchainProgressProps) {
  if (!open) return null;

  const done = currentStep >= steps.length;
  const failed = currentStep === -1;
  const hashes = hash ? hash.split(",").filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-[#09488D]">{title}</h3>

        {/* Pasos */}
        <div className="space-y-2">
          {steps.map((s, i) => {
            const isCurrent = i === currentStep && !done && !failed;
            const isCompleted = (done && i < steps.length) || i < currentStep;
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                isCurrent ? "bg-[#F4F6F9] border border-[#09488D]/20" :
                isCompleted ? "bg-emerald-50/60" : "bg-slate-50 opacity-60"
              }`}>
                {isCompleted ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                ) : isCurrent ? (
                  <span className="w-5 h-5 rounded-full border-2 border-[#09488D] border-t-transparent animate-spin shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                )}
                <span className={isCompleted ? "text-emerald-700 font-medium" : isCurrent ? "text-slate-700 font-medium" : "text-slate-400"}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {failed && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            ⚠️ {error}
          </div>
        )}

        {/* Éxito + hash */}
        {done && hashes.length > 0 && (
          <div className="bg-[#F4F6F9] border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-slate-700 font-medium">
              🔐 Tus préstamos están seguros en la blockchain y los puedes consultar en Amoy con este código:
            </p>
            <div className="space-y-1">
              {hashes.map((h, i) => <HashLink key={h} hash={h} index={i} />)}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(hashes.join(",")).then(() => {
                  // feedback visual simple
                  const btn = document.getElementById("copy-hash-btn");
                  if (btn) { btn.textContent = "✅ Copiado"; setTimeout(() => { if (btn) btn.textContent = "📋 Copiar código"; }, 1500); }
                });
              }}
              id="copy-hash-btn"
              className="text-xs bg-[#09488D] text-white px-3 py-1.5 rounded-lg hover:bg-[#073a6b] transition"
            >
              📋 Copiar código
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          {done || failed ? (
            <button onClick={onClose} className="btn-primary text-sm px-5">Cerrar</button>
          ) : (
            <p className="text-xs text-slate-400 animate-pulse">Procesando en la blockchain… no cierres esta ventana</p>
          )}
        </div>
      </div>
    </div>
  );
}
