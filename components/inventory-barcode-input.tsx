"use client";

import { useEffect, useRef } from "react";
import { Barcode, Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  disabled?: boolean;
};

export default function InventoryBarcodeInput({
  value,
  onChange,
  onScan,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function submit() {
    const code = value.trim();
    if (!code) return;
    onScan(code);
    onChange("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Entrada rápida por código de barras</h2>
          <div className="muted">
            Compatible con lector USB que escribe el código y presiona Enter.
          </div>
        </div>
        <Barcode size={22} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          autoFocus
          inputMode="numeric"
          placeholder="Escanea o escribe el código..."
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          style={{ flex: "1 1 360px", minWidth: 240 }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || !value.trim()}
          onClick={submit}
          style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <Search size={15} />
          Buscar
        </button>
      </div>
    </div>
  );
}
