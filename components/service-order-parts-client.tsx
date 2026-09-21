"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  stock: number | string;
  cost: number | string;
  sale_price: number | string;
};

type Part = {
  id: string;
  inventory_product_id: string | null;
  description: string;
  quantity: number | string;
  unit_cost: number | string;
  unit_price: number | string;
  created_at: string;
};

type PendingPart = {
  inventory_product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  stock: number;
  unit_price: number;
};

function num(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function ServiceOrderPartsClient({
  serviceOrderId,
  orderStatus,
  onChanged,
}: {
  serviceOrderId: string;
  orderStatus?: string;
  onChanged?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [parts, setParts] = useState<Part[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingParts, setPendingParts] = useState<PendingPart[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const locked = orderStatus === "cancelled" || orderStatus === "delivered";
  const selectedProduct = products.find((item) => item.id === selectedProductId) ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [partsResult, productsResult] = await Promise.all([
        supabase
          .from("service_order_items")
          .select(
            "id, inventory_product_id, description, quantity, unit_cost, unit_price, created_at",
          )
          .eq("service_order_id", serviceOrderId)
          .eq("item_type", "part")
          .order("created_at", { ascending: false }),
        supabase
          .from("inventory_products")
          .select("id, sku, barcode, name, brand, stock, cost, sale_price")
          .eq("active", true)
          .order("name"),
      ]);

      if (partsResult.error) throw partsResult.error;
      if (productsResult.error) throw productsResult.error;

      setParts((partsResult.data ?? []) as Part[]);
      setProducts((productsResult.data ?? []) as Product[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los repuestos.",
      );
    } finally {
      setLoading(false);
    }
  }, [serviceOrderId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = term
      ? products.filter((product) =>
          [product.name, product.sku, product.barcode, product.brand]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      : products;

    return source.slice(0, 50);
  }, [products, search]);

  const totalPending = useMemo(
    () =>
      pendingParts.reduce(
        (total, part) => total + part.quantity * part.unit_price,
        0,
      ),
    [pendingParts],
  );

  const totalPartsCost = useMemo(
    () =>
      parts.reduce(
        (total, part) => total + num(part.quantity) * num(part.unit_cost),
        0,
      ),
    [parts],
  );

  function addToPendingList() {
    setError("");
    setMessage("");

    if (locked) {
      setError("Esta orden ya no permite agregar repuestos.");
      return;
    }

    if (!selectedProduct) {
      setError("Selecciona un repuesto.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    const existing = pendingParts.find(
      (part) => part.inventory_product_id === selectedProduct.id,
    );
    const nextQuantity = (existing?.quantity ?? 0) + qty;

    if (num(selectedProduct.stock) < nextQuantity) {
      setError(
        `Stock insuficiente para ${selectedProduct.name}. Disponible: ${num(
          selectedProduct.stock,
        )}. En lista: ${existing?.quantity ?? 0}.`,
      );
      return;
    }

    setPendingParts((current) => {
      const index = current.findIndex(
        (part) => part.inventory_product_id === selectedProduct.id,
      );

      if (index === -1) {
        return [
          ...current,
          {
            inventory_product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity: qty,
            stock: num(selectedProduct.stock),
            unit_price: num(selectedProduct.sale_price),
          },
        ];
      }

      const copy = [...current];
      copy[index] = {
        ...copy[index],
        quantity: copy[index].quantity + qty,
      };
      return copy;
    });

    setSelectedProductId("");
    setQuantity("1");
    setSearch("");
  }

  function removeFromPendingList(productId: string) {
    if (saving) return;
    setPendingParts((current) =>
      current.filter((part) => part.inventory_product_id !== productId),
    );
  }

  function clearPendingList() {
    if (saving) return;
    setPendingParts([]);
  }

  async function consumePendingParts() {
    setError("");
    setMessage("");

    if (locked) {
      setError("Esta orden ya no permite consumo de repuestos.");
      return;
    }

    if (!pendingParts.length) {
      setError("Agrega al menos un repuesto a la lista antes de consumir.");
      return;
    }

    const summary = pendingParts
      .map(
        (part) =>
          `• ${part.product_name} (${part.sku}) × ${part.quantity} = ${money(
            part.quantity * part.unit_price,
          )}`,
      )
      .join("\n");

    const confirmed = window.confirm(
      `¿Confirmas que la lista de repuestos es correcta?\n\n${summary}\n\nAl confirmar, las cantidades se descontarán inmediatamente del inventario y se registrarán en la orden de servicio.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc(
        "consume_service_order_parts_batch",
        {
          p_service_order_id: serviceOrderId,
          p_items: pendingParts.map((part) => ({
            inventory_product_id: part.inventory_product_id,
            quantity: part.quantity,
          })),
        },
      );

      if (rpcError) throw rpcError;

      const result = data as {
        consumed_count?: number | string;
        consumed?: Array<{
          product_name?: string;
          quantity?: number | string;
          new_stock?: number | string;
        }>;
      };

      const consumedCount = num(result?.consumed_count);
      const firstStock = result?.consumed?.[0]?.new_stock;

      setMessage(
        `${consumedCount || pendingParts.length} referencia(s) consumida(s) correctamente. ` +
          (firstStock !== undefined
            ? `Stock actualizado. `
            : "Inventario actualizado. "),
      );
      setPendingParts([]);

      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consumir la lista de repuestos.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePart(part: Part) {
    if (locked || saving) return;

    const confirmed = window.confirm(
      `¿Eliminar el repuesto "${part.description}" de esta orden?\n\nSe restaurará la cantidad consumida al inventario y se registrará el movimiento de devolución.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "remove_service_order_part",
        {
          p_service_order_item_id: part.id,
        },
      );

      if (rpcError) throw rpcError;

      const result = data as {
        product_name?: string;
        quantity?: number | string;
        new_stock?: number | string;
      };

      setMessage(
        `Repuesto eliminado: ${
          result.product_name ?? part.description
        } × ${num(result.quantity ?? part.quantity)}. ` +
          `Stock restaurado: ${num(result.new_stock)}.`,
      );

      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el repuesto.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Repuestos utilizados</h2>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Agrega una o varias referencias a la lista. El inventario solo se
            descuenta al confirmar el botón <strong>Consumir repuestos</strong>.
          </div>
        </div>
        <Package size={16} />
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fff0f0",
            color: "#a52222",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#e9f8f2",
            color: "#146c50",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Buscar repuesto</label>
          <div className="search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, SKU o código de barras..."
              disabled={saving || locked}
            />
          </div>
        </div>

        <div className="field">
          <label>Producto</label>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            disabled={loading || saving || locked}
          >
            <option value="">Seleccionar producto...</option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.sku} · Stock {num(product.stock)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Cantidad</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={saving || locked}
          />
        </div>

        <div
          className="field"
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <label style={{ visibility: "hidden" }}>Acción</label>
          <button
            className="btn btn-primary"
            type="button"
            onClick={addToPendingList}
            disabled={saving || locked}
          >
            <Plus size={14} />
            Agregar a lista
          </button>
        </div>
      </div>

      {selectedProduct && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 10,
            background: "#f7faf9",
            border: "1px solid #e5ebe9",
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 10,
          }}
        >
          <div>
            <span className="muted">Stock disponible</span>
            <strong style={{ display: "block" }}>
              {num(selectedProduct.stock)}
            </strong>
          </div>
          <div>
            <span className="muted">Costo actual</span>
            <strong style={{ display: "block" }}>
              {money(num(selectedProduct.cost))}
            </strong>
          </div>
          <div>
            <span className="muted">Precio</span>
            <strong style={{ display: "block" }}>
              {money(num(selectedProduct.sale_price))}
            </strong>
          </div>
          <div>
            <span className="muted">Total en lista</span>
            <strong style={{ display: "block" }}>
              {money(num(selectedProduct.sale_price) * Math.max(0, Number(quantity) || 0))}
            </strong>
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: 16,
          border: "1px solid #e2e7e5",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div className="section-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Lista pendiente de consumo</h3>
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              Puedes agregar varias referencias, corregir cantidades o eliminar
              una referencia antes de consumir.
            </div>
          </div>
          <strong>{pendingParts.length}</strong>
        </div>

        {pendingParts.length === 0 ? (
          <div className="empty">No hay repuestos pendientes de consumo.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Repuesto</th>
                    <th>SKU</th>
                    <th>Cantidad</th>
                    <th>Valor unitario</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pendingParts.map((part) => (
                    <tr key={part.inventory_product_id}>
                      <td>
                        <strong>{part.product_name}</strong>
                      </td>
                      <td>{part.sku}</td>
                      <td>{part.quantity}</td>
                      <td>{money(part.unit_price)}</td>
                      <td>{money(part.quantity * part.unit_price)}</td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() =>
                            removeFromPendingList(part.inventory_product_id)
                          }
                          disabled={saving}
                          title="Eliminar de la lista"
                        >
                          <Trash2 size={14} />
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong>Total de la lista: {money(totalPending)}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={clearPendingList}
                  disabled={saving}
                >
                  Vaciar lista
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void consumePendingParts()}
                  disabled={saving || locked}
                >
                  <Package size={14} />
                  {saving ? "Consumiendo..." : "Consumir repuestos"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="section-head" style={{ marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>Repuestos consumidos en la orden</h3>
          <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
            Estos registros ya descontaron inventario. Al eliminar uno se
            devuelve la cantidad al stock.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty">Cargando repuestos...</div>
      ) : parts.length === 0 ? (
        <div className="empty">Aún no hay repuestos consumidos en esta orden.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Repuesto</th>
                  <th>Cantidad</th>
                  <th>Costo unitario</th>
                  <th>Costo total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id}>
                    <td>{formatDate(part.created_at)}</td>
                    <td>
                      <strong>{part.description}</strong>
                    </td>
                    <td>{num(part.quantity)}</td>
                    <td>{money(num(part.unit_cost))}</td>
                    <td>
                      {money(num(part.quantity) * num(part.unit_cost))}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => void removePart(part)}
                        disabled={saving || locked}
                        title="Eliminar repuesto"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div className="muted" style={{ fontSize: 11 }}>
              {parts.length} registro{parts.length === 1 ? "" : "s"} consumido
              {parts.length === 1 ? "" : "s"}.
            </div>
            <strong>Costo real de repuestos: {money(totalPartsCost)}</strong>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => void load()}
          disabled={loading || saving}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {locked && (
        <div className="footer-note" style={{ marginTop: 10 }}>
          La orden está cerrada para consumo de inventario.
        </div>
      )}
    </div>
  );
}
