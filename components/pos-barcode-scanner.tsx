"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BarcodeProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  stock: number | string;
  sale_price: number | string;
  active: boolean;
};

export default function PosBarcodeScanner({
  organizationId,
  onProduct,
}: {
  organizationId: string;
  onProduct: (product: BarcodeProduct) => void;
}) {
  const supabase = createClient();
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function scan() {
    const value = barcode.trim();
    if (!value) return;

    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("inventory_products")
        .select("id, sku, barcode, name, brand, stock, sale_price, active")
        .eq("organization_id", organizationId)
        .eq("barcode", value)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError(`Producto no encontrado: ${value}`);
        return;
      }

      if (Number(data.stock ?? 0) <= 0) {
        setError(`Sin stock: ${data.name}`);
        return;
      }

      onProduct(data as BarcodeProduct);
      setBarcode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible buscar el producto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontWeight: 600 }}>Escanear producto</label>
      <input
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void scan();
          }
        }}
        placeholder="Escanee el código y presione Enter"
        autoFocus
        autoComplete="off"
        disabled={loading}
      />
      {error && <span style={{ color: "#a52222", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
