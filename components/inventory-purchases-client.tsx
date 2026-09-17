"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/utils";
import InventoryBarcodeInput from "./inventory-barcode-input";

type Supplier = { id: string; name: string };

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  stock: number | string;
  cost: number | string;
  sale_price: number | string;
  active: boolean;
};

type PurchaseLine = {
  id: string;
  product: Product;
  quantity: number;
  unitCost: number;
};

type PurchaseHistory = {
  id: string;
  purchase_number: number | string;
  purchase_date: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  reference: string | null;
  notes: string | null;
  supplier: { name: string }[] | null;
  created_at: string;
};

type Movement = {
  id: string;
  inventory_product_id: string;
  movement_type: string;
  quantity: number | string;
  unit_cost: number | string | null;
  reference: string | null;
  created_at: string;
  product: { name: string; sku: string }[] | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatPurchaseNumber(value: number | string) {
  return `CP-${String(value).padStart(6, "0")}`;
}

export default function InventoryPurchasesClient() {
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsByBarcode, setProductsByBarcode] = useState<Record<string, Product>>({});
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    [lines]
  );

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((product) =>
        [product.name, product.sku, product.barcode ?? "", product.brand ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 12);
  }, [products, productSearch]);

  async function loadBase() {
    const orgId = await getCurrentOrganizationId();

    const [supplierResult, productResult] = await Promise.all([
      supabase
        .from("suppliers")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("inventory_products")
        .select("id, sku, barcode, name, brand, stock, cost, sale_price, active")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("name"),
    ]);

    if (supplierResult.error) throw supplierResult.error;
    if (productResult.error) throw productResult.error;

    setSuppliers((supplierResult.data ?? []) as Supplier[]);
    const productRows = (productResult.data ?? []) as Product[];
    setProducts(productRows);

    const barcodeMap: Record<string, Product> = {};
    for (const product of productRows) {
      const code = product.barcode?.trim();
      if (code) barcodeMap[code] = product;
    }
    setProductsByBarcode(barcodeMap);

    return orgId;
  }

  async function loadHistory(orgId?: string) {
    setLoadingHistory(true);
    try {
      const organizationId = orgId ?? (await getCurrentOrganizationId());

      const [purchaseResult, movementResult] = await Promise.all([
        supabase
          .from("inventory_purchases")
          .select(
            "id, purchase_number, purchase_date, subtotal, tax, total, reference, notes, created_at, supplier:suppliers(name)"
          )
          .eq("organization_id", organizationId)
          .order("purchase_date", { ascending: false })
          .limit(25),
        supabase
          .from("inventory_movements")
          .select(
            "id, inventory_product_id, movement_type, quantity, unit_cost, reference, created_at, product:inventory_products(name, sku)"
          )
          .eq("organization_id", organizationId)
          .eq("movement_type", "purchase")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (purchaseResult.error) throw purchaseResult.error;
      if (movementResult.error) throw movementResult.error;

      setHistory((purchaseResult.data ?? []) as PurchaseHistory[]);
      setMovements((movementResult.data ?? []) as Movement[]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const orgId = await loadBase();
      await loadHistory(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar compras e inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function addProduct(product: Product) {
    setError("");
    setMessage("");

    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          product,
          quantity: 1,
          unitCost: Number(product.cost || 0),
        },
      ];
    });

    setProductSearch("");
    setMessage(`${product.name} agregado a la compra.`);
  }

  function addScannedProduct(code: string) {
    const normalized = code.trim();
    const product = productsByBarcode[normalized];
    if (!product) {
      setError(`No se encontró un producto activo con el código ${normalized}.`);
      setMessage("");
      return;
    }
    addProduct(product);
  }

  function updateLine(id: string, field: "quantity" | "unitCost", value: number) {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? { ...line, [field]: Number.isFinite(value) ? Math.max(field === "quantity" ? 0.01 : 0, value) : 0 }
          : line
      )
    );
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  async function savePurchase() {
    setError("");
    setMessage("");

    if (!supplierId) {
      setError("Selecciona un proveedor.");
      return;
    }

    if (lines.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }

    if (lines.some((line) => line.quantity <= 0 || line.unitCost < 0)) {
      setError("Revisa cantidades y costos: la cantidad debe ser mayor que cero y el costo no puede ser negativo.");
      return;
    }

    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc("create_inventory_purchase", {
        p_supplier_id: supplierId,
        p_reference: reference.trim() || null,
        p_notes: notes.trim() || null,
        p_items: lines.map((line) => ({
          inventory_product_id: line.product.id,
          quantity: line.quantity,
          unit_cost: line.unitCost,
        })),
      });

      if (rpcError) throw rpcError;

      const result = data as {
        purchase_number?: number | string;
        total?: number | string;
      };

      setMessage(
        `${formatPurchaseNumber(result.purchase_number ?? "")} registrada correctamente por ${money(
          Number(result.total ?? total)
        )}. Stock, costo y movimientos actualizados.`
      );

      setLines([]);
      setSupplierId("");
      setReference("");
      setNotes("");

      const orgId = await loadBase();
      await loadHistory(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la compra.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshHistory() {
    setMessage("");
    setError("");
    try {
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el historial.");
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link
            href="/inventario"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft size={15} />
            Inventario
          </Link>
          <h1 style={{ marginTop: 10 }}>Compras / Entradas de inventario</h1>
          <p className="muted">Proveedor → productos → cantidad → costo → confirmar → stock → movimiento → costo → historial.</p>
        </div>

        <div className="card">
          <div className="muted">Total de la compra</div>
          <strong style={{ fontSize: 26 }}>{money(total)}</strong>
        </div>
      </div>

      {message && <div className="card" style={{ marginBottom: 16, border: "1px solid #b9e4d8", background: "#effaf6", color: "#0c6b58" }}>{message}</div>}
      {error && <div className="card" style={{ marginBottom: 16, border: "1px solid #f2b8b8", background: "#fff5f5", color: "#9b1c1c" }}>{error}</div>}

      {loading ? (
        <div className="card muted">Cargando proveedores, productos e historial...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-grid">
              <div className="field">
                <label>Proveedor</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={saving}>
                  <option value="">Selecciona proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Referencia / factura del proveedor</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. FAC-45821" disabled={saving} />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Observaciones</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas de la compra..." disabled={saving} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <InventoryBarcodeInput value={barcode} onChange={setBarcode} onScan={addScannedProduct} disabled={saving} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-head">
              <div>
                <h2>Buscar producto manualmente</h2>
                <div className="muted">Busca por nombre, SKU, marca o código. Útil cuando el producto no se escanea.</div>
              </div>
              <Search size={20} />
            </div>

            <div style={{ position: "relative" }}>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Escribe nombre, SKU, marca o código..."
                disabled={saving}
              />
              {filteredProducts.length > 0 && (
                <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #dfe5e3", borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,.12)", maxHeight: 340, overflowY: "auto" }}>
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      style={{ width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderBottom: "1px solid #edf0ef", background: "white", cursor: "pointer" }}
                    >
                      <strong>{product.name}</strong>
                      <div className="muted">SKU: {product.sku} · Stock: {Number(product.stock)} · Costo: {money(Number(product.cost || 0))}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-head">
              <div>
                <h2>Productos de la entrada</h2>
                <div className="muted">Escanear o seleccionar nuevamente el mismo producto incrementa la cantidad.</div>
              </div>
              <PackagePlus size={20} />
            </div>

            {lines.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center" }}>
                <Barcode size={30} style={{ opacity: 0.35 }} />
                <div style={{ marginTop: 10 }}><strong>Agrega el primer producto</strong></div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Barcode</th>
                      <th>Stock actual</th>
                      <th>Cantidad</th>
                      <th>Costo anterior</th>
                      <th>Nuevo costo</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.product.name}</strong>
                          {line.product.brand && <div className="muted">{line.product.brand}</div>}
                        </td>
                        <td>{line.product.sku}</td>
                        <td>{line.product.barcode || "—"}</td>
                        <td>{Number(line.product.stock)}</td>
                        <td>
                          <input type="number" min="0.01" step="0.01" value={line.quantity} disabled={saving} onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))} style={{ width: 90 }} />
                        </td>
                        <td>{money(Number(line.product.cost || 0))}</td>
                        <td>
                          <input type="number" min="0" step="0.01" value={line.unitCost} disabled={saving} onChange={(e) => updateLine(line.id, "unitCost", Number(e.target.value))} style={{ width: 120 }} />
                        </td>
                        <td><strong>{money(line.quantity * line.unitCost)}</strong></td>
                        <td>
                          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => removeLine(line.id)} aria-label="Eliminar producto">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
              <div className="muted">{lines.length} producto(s) · Total {money(total)}</div>
              <button type="button" className="btn btn-primary" disabled={saving || !supplierId || lines.length === 0} onClick={() => void savePurchase()} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                {saving ? "Registrando..." : <><CheckCircle2 size={16} /> Confirmar compra</>}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><History size={20} /> Historial de compras</h2>
                <div className="muted">Últimas entradas registradas. Cada compra ya debe tener sus movimientos tipo purchase.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => void refreshHistory()} disabled={loadingHistory} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} /> Actualizar
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory((value) => !value)}>
                  {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {showHistory && (
              loadingHistory ? (
                <div className="muted">Actualizando historial...</div>
              ) : history.length === 0 ? (
                <div className="muted">Todavía no hay compras registradas.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Compra</th>
                        <th>Fecha</th>
                        <th>Proveedor</th>
                        <th>Referencia</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((purchase) => (
                        <tr key={purchase.id}>
                          <td><strong>{formatPurchaseNumber(purchase.purchase_number)}</strong></td>
                          <td>{formatDate(purchase.purchase_date)}</td>
                          <td>{purchase.supplier?.[0]?.name ?? "—"}</td>
                          <td>{purchase.reference ?? "—"}</td>
                          <td><strong>{money(Number(purchase.total))}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-head">
              <div>
                <h2>Movimientos generados por compras</h2>
                <div className="muted">Trazabilidad directa entre la entrada y el inventario.</div>
              </div>
            </div>

            {movements.length === 0 ? (
              <div className="muted">No hay movimientos de compra registrados todavía.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Referencia</th>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Cantidad</th>
                      <th>Costo unitario</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.created_at)}</td>
                        <td>{movement.reference ?? "—"}</td>
                        <td>{movement.product?.[0]?.name ?? movement.inventory_product_id}</td>
                        <td>{movement.product?.[0]?.sku ?? "—"}</td>
                        <td>+{Number(movement.quantity)}</td>
                        <td>{money(Number(movement.unit_cost ?? 0))}</td>
                        <td>{movement.movement_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
