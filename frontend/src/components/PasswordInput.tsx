"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Input de contraseña con botón 👁 para ver/ocultar. */
export default function PasswordInput({ value, onChange, placeholder = "••••••••", autoFocus, disabled, className }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#09488D] focus:border-transparent outline-none transition pr-11 ${className || ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#09488D] transition"
        title={visible ? "Ocultar contraseña" : "Ver contraseña"}
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
