"use client";

import { useEffect, useRef, useState } from "react";

export default function BarcodeField({
  value,
  onChange,
  onScan,
  disabled = false,
}: {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (barcode: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalValue(value ?? "");
  }, [value]);

  function update(next: string) {
    setInternalValue(next);
    onChange?.(next);
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const barcode = internalValue.trim();
    if (!barcode) return;

    await onScan?.(barcode);
    update("");
    ref.current?.focus();
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontWeight: 600 }}>Código de barras</label>
      <input
        ref={ref}
        value={internalValue}
        disabled={disabled}
        onChange={(e) => update(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escanee o escriba el código y presione Enter"
        autoComplete="off"
      />
      <span className="muted" style={{ fontSize: 12 }}>
        Compatible con lectores USB tipo teclado.
      </span>
    </div>
  );
}
