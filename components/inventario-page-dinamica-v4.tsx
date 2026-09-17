"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/utils";
import { Status } from "@/components/module-page";

type InventoryProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  brand: string | null;
  stock: number | string;
  minimum_stock: number | string;
  cost: number | string;
  sale_price: number | string;
  active: boolean;
  updated_at: string;
};

type InventoryMovement = {
  id: string;
  inventory_product_id: string;
  movement_type: string;
  quantity: number | string;
  unit_cost: number | string | null;
  reference: string | null;
  created_at: string;
  product: { name: string; sku: string } | null;
};

function numberValue(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function movementLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "purchase" || normalized === "entry" || normalized === "in") return "Entrada";
  if (normalized === "order_usage") return "Consumo de orden";
  if (normalized === "sale" || normalized === "out") return "Salida";
  if (normalized === "return") return "Devolución";
  if (normalized === "adjustment") return "Ajuste";
  if (normalized === "consumption") return "Consumo";
  return type || "Movimiento";
}

function movementTone(type: string): "green" | "red" | "yellow" {
  const normalized = type.toLowerCase();
  if (normalized === "purchase" || normalized === "entry" || normalized === "in" || normalized === "return") {
    return "green";
  }
  if (normalized === "sale" || normalized === "out" || normalized === "consumption" || normalized === "order_usage") {
    return "red";
  }
  return "yellow";
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Inventario() {
  const supabase = createClient();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadInventory = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setRefreshing(true);
      setError("");

      const orgId = organizationId || (await getCurrentOrganizationId());
      setOrganizationId(orgId);

      const [productsResult, movementsResult] = await Promise.all([
        supabase
          .from("inventory_products")
          .select(
            "id, sku, barcode, name, category, brand, stock, minimum_stock, cost, sale_price, active, updated_at"
          )
          .eq("organization_id", orgId)
          .eq("active", true)
          .order("name"),
        supabase
          .from("inventory_movements")
          .select(
            "id, inventory_product_id, movement_type, quantity, unit_cost, reference, created_at, product:inventory_products(name, sku)"
          )
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (movementsResult.error) throw movementsResult.error;

      const normalizedMovements = (movementsResult.data ?? []).map((row: any) => ({
        ...row,
        product: Array.isArray(row.product) ? row.product[0] ?? null : row.product ?? null,
      })) as InventoryMovement[];

      setProducts((productsResult.data ?? []) as InventoryProduct[]);
      setMovements(normalizedMovements);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("INVENTARIO", err);
      setError(err instanceof Error ? err.message : "No fue posible cargar el inventario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    void loadInventory(false);
  }, [loadInventory]);

  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`inventory-live-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_products", filter: `organization_id=eq.${organizationId}` },
        () => void loadInventory(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_movements", filter: `organization_id=eq.${organizationId}` },
        () => void loadInventory(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_purchases", filter: `organization_id=eq.${organizationId}` },
        () => void loadInventory(false)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, loadInventory, supabase]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.barcode ?? "", product.category ?? "", product.brand ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const metrics = useMemo(() => {
    const lowStock = products.filter(
      (product) => numberValue(product.stock) <= numberValue(product.minimum_stock)
    ).length;

    const inventoryValue = products.reduce(
      (sum, product) => sum + numberValue(product.stock) * numberValue(product.cost),
      0
    );

    const todayKey = new Date().toLocaleDateString("es-CO");
    const movementsToday = movements.filter(
      (movement) => new Date(movement.created_at).toLocaleDateString("es-CO") === todayKey
    ).length;

    return {
      products: products.length,
      lowStock,
      inventoryValue,
      movementsToday,
    };
  }, [products, movements]);

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">Stock conectado</div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">
            Existencias, costos, compras y ventas conectadas directamente con Supabase.
          </p>
          {lastUpdated && (
            <div className="muted" style={{ marginTop: 6 }}>
              Actualizado: {lastUpdated.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void loadInventory()}
            disabled={refreshing}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
          <Link
            href="/inventario/compras"
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <ShoppingCart size={15} />
            Compras / Entradas
          </Link>
          <Link
            href="/inventario/productos/nuevo"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <Plus size={15} />
            Nuevo producto
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: "#ef4444" }}>
          <strong>No fue posible actualizar Inventario.</strong>
          <div className="muted" style={{ marginTop: 4 }}>{error}</div>
        </div>
      )}

      <div className="grid grid-4">
        <div className="card metric">
          <div className="label">Productos activos</div>
          <div className="value">{metrics.products}</div>
        </div>
        <div className="card metric red">
          <div className="label">Stock bajo</div>
          <div className="value">{metrics.lowStock}</div>
        </div>
        <div className="card metric mint">
          <div className="label">Valor inventario</div>
          <div className="value">{money(metrics.inventoryValue)}</div>
        </div>
        <div className="card metric">
          <div className="label">Movimientos hoy</div>
          <div className="value">{metrics.movementsToday}</div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="toolbar">
          <div className="search" style={{ flex: 1, minWidth: 240 }}>
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar SKU, código, producto, marca o categoría..."
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/inventario/compras" className="btn btn-ghost">
              <TrendingUp size={14} />
              Entrada
            </Link>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => void loadInventory()}
              disabled={refreshing}
            >
              <TrendingDown size={14} />
              Actualizar salidas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty">Cargando inventario real...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty">
            No hay productos que coincidan con la búsqueda.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Costo</th>
                  <th>Precio</th>
                  <th>Valor stock</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stock = numberValue(product.stock);
                  const minimum = numberValue(product.minimum_stock);
                  const cost = numberValue(product.cost);
                  const low = stock <= minimum;

                  return (
                    <tr key={product.id}>
                      <td>{product.sku || "-"}</td>
                      <td>
                        <strong>{product.name}</strong>
                        {product.barcode && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            CB: {product.barcode}
                          </div>
                        )}
                      </td>
                      <td>{product.category || "-"}</td>
                      <td>{formatQuantity(stock)}</td>
                      <td>{money(cost)}</td>
                      <td>{money(numberValue(product.sale_price))}</td>
                      <td>{money(stock * cost)}</td>
                      <td>
                        {low ? (
                          <Status tone="red">Stock bajo</Status>
                        ) : (
                          <Status tone="green">Normal</Status>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Últimos movimientos asd</h2>
            <div className="muted" style={{ marginTop: 4 }}>
              Aquí se reflejan las entradas de compras y las salidas generadas por POS/operación.
            </div>
          </div>
          <ArrowLeftRight size={16} />
        </div>

        {movements.length === 0 ? (
          <div className="empty">Aún no existen movimientos de inventario.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Costo</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const quantity = numberValue(movement.quantity);
                  const type = movementLabel(movement.movement_type);
                  const signedQuantity =
                    movement.movement_type.toLowerCase() === "sale" && quantity > 0
                      ? -quantity
                      : quantity;

                  return (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.created_at)}</td>
                      <td>
                        <strong>{movement.product?.name || "Producto eliminado"}</strong>
                        {movement.product?.sku && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            {movement.product.sku}
                          </div>
                        )}
                      </td>
                      <td>
                        <Status tone={movementTone(movement.movement_type)}>{type}</Status>
                      </td>
                      <td>{signedQuantity > 0 ? `+${formatQuantity(signedQuantity)}` : formatQuantity(signedQuantity)}</td>
                      <td>{movement.unit_cost == null ? "-" : money(numberValue(movement.unit_cost))}</td>
                      <td>{movement.reference || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Flujo conectado</h2>
            <div className="muted" style={{ marginTop: 4 }}>
              Las cifras de esta pantalla ya no dependen de datos demo.
            </div>
          </div>
          <Package size={16} />
        </div>
        <div className="grid grid-4" style={{ marginTop: 12 }}>
          <Link href="/inventario/productos/nuevo" className="card" style={{ textDecoration: "none" }}>
            <strong>1. Productos</strong>
            <div className="muted" style={{ marginTop: 5 }}>Catálogo real y stock actual.</div>
          </Link>
          <Link href="/inventario/compras" className="card" style={{ textDecoration: "none" }}>
            <strong>2. Compras</strong>
            <div className="muted" style={{ marginTop: 5 }}>Entrada y actualización de costo.</div>
          </Link>
          <Link href="/pos" className="card" style={{ textDecoration: "none" }}>
            <strong>3. Ventas POS</strong>
            <div className="muted" style={{ marginTop: 5 }}>Las salidas deben reflejarse aquí.</div>
          </Link>
          <div className="card">
            <strong>4. Kardex</strong>
            <div className="muted" style={{ marginTop: 5 }}>Historial de movimientos y referencias.</div>
          </div>
        </div>
      </div>
    </>
  );
}
