"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Barcode, PackagePlus, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryProductForm() {
  const supabase = createClient();
  const [organizationId, setOrganizationId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [minimumStock, setMinimumStock] = useState("0");
  const [cost, setCost] = useState("0");
  const [salePrice, setSalePrice] = useState("0");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const orgId = await getCurrentOrganizationId();
        setOrganizationId(orgId);

        const { data, error: supplierError } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("organization_id", orgId)
          .eq("active", true)
          .order("name");

        if (supplierError) throw supplierError;
        setSuppliers((data ?? []) as Supplier[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function saveProduct() {
    setError("");

    if (!organizationId) {
      setError("No se encontró la organización activa.");
      return;
    }

    const normalizedSku = sku.trim();
    const normalizedName = name.trim();
    const normalizedBarcode = barcode.trim() || null;
    const normalizedCategory = category.trim() || null;
    const normalizedBrand = brand.trim() || null;
    const numericMinimum = Number(minimumStock);
    const numericCost = Number(cost);
    const numericSalePrice = Number(salePrice);

    if (!normalizedSku || !normalizedName) {
      setError("SKU y nombre del producto son obligatorios.");
      return;
    }

    if (![numericMinimum, numericCost, numericSalePrice].every(Number.isFinite)) {
      setError("Los valores numéricos no son válidos.");
      return;
    }

    if (numericMinimum < 0 || numericCost < 0 || numericSalePrice < 0) {
      setError("Stock mínimo, costo y precio no pueden ser negativos.");
      return;
    }

    try {
      setSaving(true);

      const { data: existingSku, error: skuError } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("sku", normalizedSku)
        .maybeSingle();

      if (skuError) throw skuError;
      if (existingSku) {
        setError(`Ya existe un producto con el SKU ${normalizedSku}.`);
        return;
      }

      if (normalizedBarcode) {
        const { data: existingBarcode, error: barcodeError } = await supabase
          .from("inventory_products")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("barcode", normalizedBarcode)
          .maybeSingle();

        if (barcodeError) throw barcodeError;
        if (existingBarcode) {
          setError(`Ya existe un producto con el código de barras ${normalizedBarcode}.`);
          return;
        }
      }

      const { data, error: insertError } = await supabase
        .from("inventory_products")
        .insert({
          organization_id: organizationId,
          supplier_id: supplierId || null,
          sku: normalizedSku,
          name: normalizedName,
          category: normalizedCategory,
          brand: normalizedBrand,
          barcode: normalizedBarcode,
          stock: 0,
          minimum_stock: numericMinimum,
          cost: numericCost,
          sale_price: numericSalePrice,
          active: true,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      window.location.assign("/inventario?created=1");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  const previewMargin = Number(salePrice) - Number(cost);

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link href="/inventario" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={15} /> Inventario
          </Link>
          <h1 style={{ marginTop: 10 }}>Nuevo producto</h1>
          <p className="muted">Crea el producto antes de registrar compras o entradas de inventario.</p>
        </div>
        <div className="card" style={{ minWidth: 220 }}>
          <div className="muted">Margen unitario estimado</div>
          <strong style={{ fontSize: 22 }}>{money(Math.max(0, previewMargin))}</strong>
        </div>
      </div>

      {error && <div className="card" style={{ marginBottom: 16, border: "1px solid #f2b8b8", background: "#fff5f5", color: "#9b1c1c" }}>{error}</div>}

      {loading ? (
        <div className="card muted">Cargando proveedores...</div>
      ) : (
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Información del producto</h2>
              <div className="muted">El stock inicial queda en 0; las compras posteriores generarán las entradas.</div>
            </div>
            <PackagePlus size={18} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>SKU *</label>
              <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="Ej. FIL-YAM-FZ-01" disabled={saving} />
            </div>
            <div className="field">
              <label>Nombre *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Filtro de aceite Yamaha FZ" disabled={saving} />
            </div>
            <div className="field">
              <label>Categoría</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filtros" disabled={saving} />
            </div>
            <div className="field">
              <label>Marca</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Yamaha" disabled={saving} />
            </div>
            <div className="field" style={{ position: "relative" }}>
              <label>Código de barras</label>
              <div style={{ position: "relative" }}>
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Escanea o escribe el código" disabled={saving} style={{ paddingRight: 42 }} />
                <Barcode size={18} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.55 }} />
              </div>
            </div>
            <div className="field">
              <label>Proveedor principal</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={saving}>
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Stock mínimo</label>
              <input type="number" min="0" step="0.01" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} disabled={saving} />
            </div>
            <div className="field">
              <label>Costo actual</label>
              <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} disabled={saving} />
            </div>
            <div className="field">
              <label>Precio de venta</label>
              <input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} disabled={saving} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            <Link href="/inventario" className="btn btn-secondary">Cancelar</Link>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveProduct()} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Save size={15} /> {saving ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
