"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt, Search, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Product = {
  id: string;
  sku: string;
  name: string;
  stock: number | string;
  sale_price: number | string;
};

type Mechanic = {
  id: string;
  full_name: string;
  active: boolean;
};

type SaleType = "service" | "part" | "both";

export default function QuickServicePosClient() {
  const supabase = createClient();

  const [saleType, setSaleType] = useState<SaleType>("service");

  const [serviceName, setServiceName] = useState(
    ""
  );

  const [servicePrice, setServicePrice] = useState("0");

  const [products, setProducts] = useState<Product[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  const [productId, setProductId] = useState("");
  const [mechanicId, setMechanicId] = useState("");

  const [qty, setQty] = useState("1");
  const [payment, setPayment] = useState("cash");

  const [search, setSearch] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);

        const [{ data: productData, error: productError }, { data: mechanicData, error: mechanicError }] =
          await Promise.all([
            supabase
              .from("inventory_products")
              .select(
                "id,sku,name,stock,sale_price"
              )
              .eq("active", true)
              .gt("stock", 0)
              .order("name")
              .limit(100),

            supabase
              .from("mechanics")
              .select("id,full_name,active")
              .eq("active", true)
              .order("full_name"),
          ]);

        if (productError) {
          throw productError;
        }

        if (mechanicError) {
          throw mechanicError;
        }

        setProducts(productData ?? []);
        setMechanics(mechanicData ?? []);
      } catch (error) {
        console.error(error);

        setErr(
          error instanceof Error
            ? error.message
            : "No fue posible cargar los datos."
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [supabase]);

  const filtered = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [products, search]
  );

  const product = products.find(
    (item) => item.id === productId
  );

  const hasService =
    saleType === "service" ||
    saleType === "both";

  const hasPart =
    saleType === "part" ||
    saleType === "both";

  const parsedServicePrice = Number(
    servicePrice || 0
  );

  const parsedQty = Number(qty || 0);

  const partTotal =
    hasPart && product
      ? Number(product.sale_price || 0) * parsedQty
      : 0;

  const serviceTotal =
    hasService
      ? parsedServicePrice
      : 0;

  const total =
    serviceTotal + partTotal;

  function changeSaleType(
    value: SaleType
  ) {
    setSaleType(value);

    setMsg("");
    setErr("");

    /*
      Si la venta deja de tener mano de obra,
      el mecánico deja de ser necesario.
    */
    if (value === "part") {
      setMechanicId("");
    }

    /*
      Si la venta deja de tener repuesto,
      limpiamos la selección del producto.
    */
    if (value === "service") {
      setProductId("");
      setQty("1");
      setSearch("");
    }
  }

  async function save() {
    try {
      setSaving(true);
      setErr("");
      setMsg("");

      if (
        saleType === "service" ||
        saleType === "both"
      ) {
        if (!serviceName.trim()) {
          throw new Error(
            "Ingrese el nombre del servicio."
          );
        }

        if (
          Number.isNaN(parsedServicePrice) ||
          parsedServicePrice < 0
        ) {
          throw new Error(
            "El valor del servicio no es válido."
          );
        }

        if (!mechanicId) {
          throw new Error(
            "Esta venta contiene mano de obra. Debe seleccionar un mecánico."
          );
        }
      }

      if (
        saleType === "part" ||
        saleType === "both"
      ) {
        if (!productId || !product) {
          throw new Error(
            "Seleccione un repuesto."
          );
        }

        if (
          !Number.isInteger(parsedQty) ||
          parsedQty < 1
        ) {
          throw new Error(
            "La cantidad del repuesto debe ser al menos 1."
          );
        }

        if (
          parsedQty >
          Number(product.stock)
        ) {
          throw new Error(
            `Stock insuficiente. Disponible: ${product.stock}.`
          );
        }
      }

      const items = [];

      /*
        MANO DE OBRA
      */
      if (hasService) {
        items.push({
          item_type: "service",
          description: serviceName.trim(),
          quantity: 1,
          unit_price: parsedServicePrice,
          unit_cost: 0,
        });
      }

      /*
        REPUESTO
      */
      if (hasPart && product) {
        items.push({
          item_type: "part",
          inventory_product_id: product.id,
          description: product.name,
          quantity: parsedQty,
          unit_price: Number(
            product.sale_price || 0
          ),
          unit_cost: 0,
        });
      }

      if (items.length === 0) {
        throw new Error(
          "La venta debe contener al menos un concepto."
        );
      }

      const { data, error } =
        await supabase.rpc(
          "create_quick_service_sale",
          {
            p_items: items,

            p_payment_method: payment,

            /*
              Mecánico:
              - obligatorio si hay servicio
              - null si es solo repuesto
            */
            p_mechanic_id:
              hasService
                ? mechanicId
                : null,
          }
        );

      if (error) {
        throw error;
      }

      setMsg(
        `Venta rápida creada: ${
          data?.invoice_number ?? "sin factura"
        } · ${money(
          Number(data?.total ?? total)
        )}`
      );

      setProductId("");
      setMechanicId("");
      setQty("1");
      setSearch("");

      if (saleType === "part") {
        /*
          Después de una venta solo de repuesto,
          mantenemos el formulario listo para otra.
        */
        setSaleType("part");
      }
    } catch (error) {
      console.error(error);

      setErr(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la venta rápida."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>
            Venta rápida / servicio express
          </h2>

          <div className="muted">
            Venta de servicios y/o repuestos sin
            crear cliente, moto ni orden de servicio.
          </div>
        </div>

        <Receipt size={18} />
      </div>

      {msg && (
        <div
          className="card"
          style={{
            marginBottom: 12,
          }}
        >
          {msg}
        </div>
      )}

      {err && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            color: "#a52222",
          }}
        >
          {err}
        </div>
      )}

      <div className="form-grid">
        {/* TIPO DE VENTA */}

        <div
          className="field"
          style={{
            gridColumn: "1 / -1",
          }}
        >
          <label>
            Tipo de venta
          </label>

          <select
            value={saleType}
            onChange={(e) =>
              changeSaleType(
                e.target.value as SaleType
              )
            }
            disabled={
              saving || loadingData
            }
          >
            <option value="service">
              Servicio / mano de obra
            </option>

            <option value="part">
              Solo repuesto
            </option>

            <option value="both">
              Servicio + repuesto
            </option>
          </select>
        </div>

        {/* SERVICIO */}

        {hasService && (
          <>
            <div className="field">
              <label>
                Servicio
              </label>

              <input
                value={serviceName}
                onChange={(e) =>
                  setServiceName(
                    e.target.value
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="field">
              <label>
                Valor mano de obra
              </label>

              <input
                type="number"
                min="0"
                value={servicePrice}
                onChange={(e) =>
                  setServicePrice(
                    e.target.value
                  )
                }
                disabled={saving}
              />
            </div>

            {/* MECÁNICO */}

            <div
              className="field"
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <label>
                <Wrench
                  size={15}
                  style={{
                    verticalAlign:
                      "middle",
                    marginRight: 5,
                  }}
                />

                Mecánico *
              </label>

              <select
                value={mechanicId}
                onChange={(e) =>
                  setMechanicId(
                    e.target.value
                  )
                }
                disabled={
                  saving || loadingData
                }
              >
                <option value="">
                  Seleccione un mecánico...
                </option>

                {mechanics.map(
                  (mechanic) => (
                    <option
                      key={mechanic.id}
                      value={mechanic.id}
                    >
                      {
                        mechanic.full_name
                      }
                    </option>
                  )
                )}
              </select>

              <div
                className="muted"
                style={{
                  marginTop: 5,
                }}
              >
                Obligatorio cuando la venta
                contiene mano de obra.
              </div>
            </div>
          </>
        )}

        {/* REPUESTO */}

        {hasPart && (
          <>
            <div
              className="field"
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <label>
                Repuesto
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  placeholder="Buscar por nombre o SKU"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  disabled={saving}
                />

                <Search size={16} />
              </div>

              <select
                value={productId}
                onChange={(e) =>
                  setProductId(
                    e.target.value
                  )
                }
                disabled={
                  saving || loadingData
                }
              >
                <option value="">
                  Seleccione un repuesto...
                </option>

                {filtered.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} · Stock{" "}
                      {item.stock} ·{" "}
                      {money(
                        Number(
                          item.sale_price ||
                            0
                        )
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            {product && (
              <div className="field">
                <label>
                  Cantidad de{" "}
                  {product.name}
                </label>

                <input
                  type="number"
                  min="1"
                  max={Number(
                    product.stock
                  )}
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      e.target.value
                    )
                  }
                  disabled={saving}
                />
              </div>
            )}
          </>
        )}

        {/* FORMA DE PAGO */}

        <div className="field">
          <label>
            Forma de pago
          </label>

          <select
            value={payment}
            onChange={(e) =>
              setPayment(
                e.target.value
              )
            }
            disabled={saving}
          >
            <option value="cash">
              Efectivo
            </option>

            <option value="transfer">
              Transferencia
            </option>

            <option value="card">
              Tarjeta
            </option>

            <option value="other">
              Otro
            </option>
          </select>
        </div>

        {/* TOTAL */}

        <div className="field">
          <label>
            Total
          </label>

          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {money(total)}
          </div>
        </div>

        {/* BOTÓN */}

        <div
          style={{
            gridColumn:
              "1 / -1",
            display: "flex",
            justifyContent:
              "flex-end",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={
              saving ||
              loadingData ||
              (hasService &&
                (!serviceName.trim() ||
                  parsedServicePrice < 0)) ||
              (hasPart &&
                !productId)
            }
          >
            {saving
              ? "Registrando..."
              : "Registrar venta rápida"}
          </button>
        </div>
      </div>
    </div>
  );
}