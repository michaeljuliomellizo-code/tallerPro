"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  getCurrentOrganizationId,
} from "@/lib/motomil/organization";

import {
  getOpenCashRegister,
} from "@/lib/motomil/cash";

import {
  money,
} from "@/lib/utils";

import InvoicePaymentPanel from "@/components/invoice-payment-panel";

import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  stock: number | string;
  sale_price: number | string;
};

type Customer = {
  id: string;
  full_name: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type SaleResult = {
  success?: boolean;
  sale_id?: string;
  sale_number?: number;
  invoice_id?: string;
  invoice_number?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  paid?: number;
  balance?: number;
  status?: string;
};

export default function PosCatalog() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [products, setProducts] =
    useState<Product[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [barcodeInput, setBarcodeInput] =
    useState("");

  const [scanning, setScanning] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [checkingCash, setCheckingCash] =
    useState(true);

  const [cashOpen, setCashOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [showCart, setShowCart] =
    useState(false);

  const [saleResult, setSaleResult] =
    useState<SaleResult | null>(
      null
    );

  const [showPayment, setShowPayment] =
    useState(false);

  const [loadingInvoice, setLoadingInvoice] =
    useState(false);

  async function loadProductsAndCustomers() {
    try {
      setLoading(true);
      setError("");

      const organizationId =
        await getCurrentOrganizationId();

      const [
        productsResult,
        customersResult,
      ] = await Promise.all([
        supabase
          .from("inventory_products")
          .select(
            "id,sku,barcode,name,stock,sale_price"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .eq("active", true)
          .gt("stock", 0)
          .order("name"),

        supabase
          .from("customers")
          .select(
            "id,full_name"
          )
          .eq(
            "organization_id",
            organizationId
          )
          .order("full_name"),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      setProducts(
        (productsResult.data ??
          []) as Product[]
      );

      setCustomers(
        (customersResult.data ??
          []) as Customer[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el POS."
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkCashRegister() {
    try {
      setCheckingCash(true);

      const organizationId =
        await getCurrentOrganizationId();

      const register =
        await getOpenCashRegister(
          organizationId
        );

      setCashOpen(
        Boolean(register)
      );
    } catch (err) {
      console.error(err);

      setCashOpen(false);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible verificar el estado de la caja."
      );
    } finally {
      setCheckingCash(false);
    }
  }

  useEffect(() => {
    void loadProductsAndCustomers();
    void checkCashRegister();
  }, []);

  const filteredProducts =
    products.filter((product) => {
      const text =
        `${product.name} ${product.sku} ${product.barcode ?? ""}`
          .toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });

  const cartTotal =
    cart.reduce(
      (total, item) =>
        total +
        Number(
          item.product.sale_price ||
            0
        ) *
          item.quantity,
      0
    );

  const cartUnits =
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  async function scanBarcode() {
    const barcode = barcodeInput.trim();

    setError("");
    setMessage("");

    if (!cashOpen) {
      setError(
        "No puedes realizar ventas porque la caja está cerrada. Abre una caja para continuar."
      );
      return;
    }

    if (!barcode) {
      setError("Ingresa o escanea un código de barras.");
      return;
    }

    try {
      setScanning(true);

      const organizationId =
        await getCurrentOrganizationId();

      const { data, error: barcodeError } =
        await supabase
          .from("inventory_products")
          .select(
            "id,sku,barcode,name,stock,sale_price"
          )
          .eq("organization_id", organizationId)
          .eq("barcode", barcode)
          .eq("active", true)
          .maybeSingle();

      if (barcodeError) {
        throw barcodeError;
      }

      if (!data) {
        setError(
          `No se encontró un producto activo con el código de barras ${barcode}.`
        );
        return;
      }

      const product = data as Product;
      const available = Number(product.stock);

      if (available <= 0) {
        setError(
          `El producto "${product.name}" no tiene stock disponible.`
        );
        return;
      }

      setCart((current) => {
        const existing = current.find(
          (item) => item.product.id === product.id
        );

        if (!existing) {
          return [
            ...current,
            {
              product,
              quantity: 1,
            },
          ];
        }

        if (existing.quantity >= available) {
          setError(
            `Stock máximo disponible para "${product.name}": ${available}.`
          );
          return current;
        }

        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      });

      setMessage(
        `Producto agregado: ${product.name}`
      );
      setBarcodeInput("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible procesar el código de barras."
      );
    } finally {
      setScanning(false);
    }
  }

  const saleTotal =
    Number(
      saleResult?.total ?? 0
    );

  const salePaid =
    Number(
      saleResult?.paid ?? 0
    );

  const saleBalance =
    Math.max(
      saleTotal - salePaid,
      0
    );

  function addToCart(
    product: Product
  ) {
    setError("");
    setMessage("");

    if (!cashOpen) {
      setError(
        "No puedes realizar ventas porque la caja está cerrada. Abre una caja para continuar."
      );

      return;
    }

    const available =
      Number(product.stock);

    if (available <= 0) {
      setError(
        `El producto "${product.name}" no tiene stock disponible.`
      );

      return;
    }

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.product.id ===
            product.id
        );

      if (!existing) {
        return [
          ...current,
          {
            product,
            quantity: 1,
          },
        ];
      }

      const nextQuantity =
        existing.quantity + 1;

      if (
        nextQuantity >
        available
      ) {
        setError(
          `Stock máximo disponible para "${product.name}": ${available}.`
        );

        return current;
      }

      return current.map(
        (item) =>
          item.product.id ===
          product.id
            ? {
                ...item,
                quantity:
                  nextQuantity,
              }
            : item
      );
    });
  }

  function decreaseQuantity(
    productId: string
  ) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id ===
          productId
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  }

  function increaseQuantity(
    item: CartItem
  ) {
    if (!cashOpen) {
      setError(
        "La caja está cerrada. No puedes modificar una venta POS."
      );

      return;
    }

    const available =
      Number(item.product.stock);

    if (
      item.quantity + 1 >
      available
    ) {
      setError(
        `Stock máximo disponible para "${item.product.name}": ${available}.`
      );

      return;
    }

    setCart((current) =>
      current.map((row) =>
        row.product.id ===
        item.product.id
          ? {
              ...row,
              quantity:
                row.quantity + 1,
            }
          : row
      )
    );
  }

  function removeFromCart(
    productId: string
  ) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product.id !==
          productId
      )
    );
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomerId("");
    setError("");
    setMessage("");
  }

  async function confirmSale() {
    setError("");
    setMessage("");

    if (!cashOpen) {
      setError(
        "No puedes realizar ventas porque la caja está cerrada. Abre una caja para continuar."
      );

      setShowCart(false);

      return;
    }

    if (cart.length === 0) {
      setError(
        "Debes agregar al menos un producto al carrito."
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * Segunda validación directamente
       * antes de ejecutar la venta.
       */
      const organizationId =
        await getCurrentOrganizationId();

      const register =
        await getOpenCashRegister(
          organizationId
        );

      if (!register) {
        setCashOpen(false);

        setShowCart(false);

        throw new Error(
          "La caja se encuentra cerrada. No se puede realizar la venta."
        );
      }

      const productIds =
        cart.map(
          (item) =>
            item.product.id
        );

      /*
       * Verificar stock actualizado.
       */
      const {
        data: currentProducts,
        error: stockError,
      } = await supabase
        .from("inventory_products")
        .select(
          "id,sku,barcode,name,stock,sale_price"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .in(
          "id",
          productIds
        );

      if (stockError) {
        throw stockError;
      }

      for (const item of cart) {
        const currentProduct =
          currentProducts?.find(
            (product) =>
              product.id ===
              item.product.id
          );

        if (!currentProduct) {
          throw new Error(
            `El producto "${item.product.name}" ya no está disponible.`
          );
        }

        const available =
          Number(
            currentProduct.stock
          );

        if (
          available <
          item.quantity
        ) {
          throw new Error(
            `Stock insuficiente para "${item.product.name}". Disponible: ${available}, solicitado: ${item.quantity}.`
          );
        }
      }

      const payload =
        cart.map((item) => ({
          inventory_product_id:
            item.product.id,

          quantity:
            item.quantity,

          unit_price:
            Number(
              item.product.sale_price
            ),
        }));

      const {
        data,
        error: rpcError,
      } =
        await supabase.rpc(
          "create_pos_sale",
          {
            p_organization_id:
              organizationId,

            p_customer_id:
              selectedCustomerId ||
              null,

            p_items:
              payload,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const result =
        data as SaleResult;

      setSaleResult(result);

      setCart([]);
      setSelectedCustomerId("");
      setShowCart(false);
      setShowPayment(false);

      setMessage(
        `Venta #${result.sale_number ?? ""} creada correctamente.`
      );

      await loadProductsAndCustomers();
      await checkCashRegister();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible confirmar la venta."
      );

      await checkCashRegister();
    } finally {
      setSaving(false);
    }
  }

  async function refreshInvoiceState() {
    if (!saleResult?.invoice_id) {
      return;
    }

    try {
      setLoadingInvoice(true);
      setError("");

      const {
        data,
        error: invoiceError,
      } = await supabase
        .from("invoices")
        .select(
          "id,invoice_number,total,paid,status"
        )
        .eq(
          "id",
          saleResult.invoice_id
        )
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      const total =
        Number(
          data.total ?? 0
        );

      const paid =
        Number(
          data.paid ?? 0
        );

      setSaleResult(
        (current) => ({
          ...current,

          invoice_id:
            data.id,

          invoice_number:
            data.invoice_number,

          total,

          paid,

          balance:
            Math.max(
              total - paid,
              0
            ),

          status:
            data.status,
        })
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el estado de la factura."
      );
    } finally {
      setLoadingInvoice(false);
    }
  }

  async function handlePaymentSuccess() {
    await refreshInvoiceState();
    await checkCashRegister();
  }

  async function openPayment() {
    /*
     * También verificamos caja antes
     * de mostrar el formulario.
     */
    await checkCashRegister();

    const organizationId =
      await getCurrentOrganizationId();

    const register =
      await getOpenCashRegister(
        organizationId
      );

    if (!register) {
      setError(
        "No puedes registrar el pago porque la caja está cerrada."
      );

      setShowPayment(false);

      return;
    }

    await refreshInvoiceState();

    setShowPayment(true);
  }

  function closePayment() {
    setShowPayment(false);
  }

  function finishSale() {
    setSaleResult(null);
    setShowPayment(false);
    setMessage("");
    setError("");
  }

  if (loading) {
    return (
      <div className="card">
        <div
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          Cargando productos...
        </div>
      </div>
    );
  }

  if (checkingCash) {
    return (
      <div className="card">
        <div
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          Verificando estado de caja...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="section-head">
        <div>
          <Link href="/inventario" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={15} /> Inventario
          </Link>
          <div className="eyebrow">
            Punto de venta
          </div>

          <h1 className="page-title">
            POS
          </h1>

          <p className="page-subtitle">
            Venta directa de repuestos
            conectada con inventario,
            facturación, pagos y caja.
          </p>
          <Link
            href="/pos/rapido"
            className="btn btn-primary"
          >
            <ShoppingBag size={16} />
            Venta Express
          </Link>
        </div>

        

        <Link
          href="/pos/ventas"
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <ShoppingBag size={16} />
          Historial de ventas
        </Link>



        <button
          className="btn btn-primary"
          onClick={() => {
            if (!cashOpen) {
              setError(
                "No puedes realizar ventas porque la caja está cerrada."
              );

              return;
            }

            setShowCart(true);
          }}
          disabled={!cashOpen}
        >
          <ShoppingCart size={15} />

          Carrito

          {cart.length > 0 && (
            <span
              style={{
                marginLeft: 4,
                fontWeight: 700,
              }}
            >
              ({cartUnits})
            </span>
          )}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            background:
              "#fff0f0",
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
            padding: 10,
            borderRadius: 8,
            background:
              "#e9f8f2",
            color: "#0c6b58",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      {!cashOpen && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border:
              "1px solid #f1d7d7",
            background:
              "#fff8f8",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                className="eyebrow"
                style={{
                  color: "#a52222",
                }}
              >
                Caja cerrada
              </div>

              <h2
                style={{
                  marginTop: 4,
                }}
              >
                Venta no disponible
              </h2>

              <p
                className="muted"
                style={{
                  fontSize: 12,
                  marginTop: 5,
                }}
              >
                Debes abrir una caja
                antes de realizar una
                venta POS.
              </p>
            </div>

            <a
              href="/finanzas/caja"
              className="btn btn-primary"
              style={{
                textDecoration:
                  "none",
              }}
            >
              <LockKeyhole
                size={14}
              />
              Abrir caja
            </a>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          marginBottom: 16,
          border: "1px solid #dfe7e4",
        }}
      >
        <div className="section-head">
          <div>
            <div className="eyebrow">
              Código de barras
            </div>
            <h2>Escanear producto</h2>
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              Conecta una pistola USB en modo teclado y escanea el producto.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            autoFocus
            value={barcodeInput}
            onChange={(event) =>
              setBarcodeInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void scanBarcode();
              }
            }}
            placeholder="Escanea o escribe el código de barras y presiona Enter..."
            disabled={!cashOpen || scanning}
            style={{
              flex: "1 1 360px",
              minWidth: 260,
            }}
          />

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void scanBarcode()}
            disabled={!cashOpen || scanning || !barcodeInput.trim()}
          >
            {scanning ? "Buscando..." : "Buscar código"}
          </button>
        </div>

        {!cashOpen && (
          <div
            className="muted"
            style={{ marginTop: 8, fontSize: 11 }}
          >
            Abre la caja para habilitar la lectura y venta mediante código de barras.
          </div>
        )}
      </div>

      <div
        className="toolbar"
        style={{
          marginBottom: 16,
        }}
      >
        <div className="search">
          <Search size={15} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Buscar por nombre o SKU..."
          />
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>
              Catálogo de repuestos
            </h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Productos activos con
              existencia disponible.
            </div>
          </div>

          <div
            className="muted"
            style={{
              fontSize: 11,
            }}
          >
            {filteredProducts.length} productos
          </div>
        </div>

        {filteredProducts.length ===
        0 ? (
          <div
            className="empty"
            style={{
              padding: 30,
              textAlign:
                "center",
            }}
          >
            No se encontraron
            productos.
          </div>
        ) : (
          <div className="grid grid-3">
            {filteredProducts.map(
              (product) => (
                <div
                  className="card"
                  key={
                    product.id
                  }
                  style={{
                    border:
                      "1px solid #e5e9e8",
                    opacity:
                      cashOpen
                        ? 1
                        : 0.65,
                  }}
                >
                  <div
                    className="section-head"
                  >
                    <div>
                      <strong>
                        {
                          product.name
                        }
                      </strong>

                      <div
                        className="muted"
                        style={{
                          marginTop: 3,
                        }}
                      >
                        SKU: {product.sku}
                      </div>

                      {product.barcode && (
                        <div
                          className="muted"
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                          }}
                        >
                          Barcode: {product.barcode}
                        </div>
                      )}
                    </div>

                    <ShoppingCart
                      size={15}
                    />
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <div>
                      <div
                        className="muted"
                        style={{
                          fontSize: 10,
                        }}
                      >
                        Stock
                      </div>

                      <strong>
                        {Number(
                          product.stock
                        ).toLocaleString(
                          "es-CO"
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      <div
                        className="muted"
                        style={{
                          fontSize: 10,
                        }}
                      >
                        Precio
                      </div>

                      <strong>
                        {money(
                          Number(
                            product.sale_price ||
                              0
                          )
                        )}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{
                      width:
                        "100%",
                      marginTop: 14,
                    }}
                    onClick={() =>
                      addToCart(
                        product
                      )
                    }
                    disabled={
                      !cashOpen
                    }
                  >
                    <Plus size={14} />

                    {cashOpen
                      ? "Agregar"
                      : "Caja cerrada"}
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div
          className="card"
          style={{
            marginTop: 16,
          }}
        >
          <div className="section-head">
            <div>
              <h2>
                Venta actual
              </h2>

              <div
                className="muted"
                style={{
                  fontSize: 11,
                }}
              >
                {cartUnits} unidades
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() =>
                setShowCart(true)
              }
              disabled={!cashOpen}
            >
              Revisar venta
            </button>
          </div>

          <div
            className="table-wrap"
          >
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Producto
                  </th>

                  <th>
                    Cantidad
                  </th>

                  <th>
                    Precio
                  </th>

                  <th>
                    Total
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {cart.map(
                  (item) => (
                    <tr
                      key={
                        item.product.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            item
                              .product
                              .name
                          }
                        </strong>

                        <div className="muted">
                          {
                            item
                              .product
                              .sku
                          }
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 5,
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() =>
                              decreaseQuantity(
                                item
                                  .product
                                  .id
                              )
                            }
                            disabled={
                              !cashOpen
                            }
                          >
                            <Minus
                              size={
                                13
                              }
                            />
                          </button>

                          <strong
                            style={{
                              minWidth: 25,
                              textAlign:
                                "center",
                            }}
                          >
                            {
                              item.quantity
                            }
                          </strong>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() =>
                              increaseQuantity(
                                item
                              )
                            }
                            disabled={
                              !cashOpen
                            }
                          >
                            <Plus
                              size={
                                13
                              }
                            />
                          </button>
                        </div>
                      </td>

                      <td>
                        {money(
                          Number(
                            item
                              .product
                              .sale_price
                          )
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            Number(
                              item
                                .product
                                .sale_price
                            ) *
                              item.quantity
                          )}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            removeFromCart(
                              item
                                .product
                                .id
                            )
                          }
                        >
                          <Trash2
                            size={
                              13
                            }
                          />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCart && (
        <div style={backdrop}>
          <div
            className="card"
            style={modal}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Punto de venta
                </div>


                <h2>
                  Confirmar venta
                </h2>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setShowCart(
                    false
                  )
                }
              >
                <X size={15} />
              </button>
            </div>

            {!cashOpen ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background:
                    "#fff8f8",
                  color:
                    "#a52222",
                  fontSize: 12,
                }}
              >
                La caja fue cerrada.
                No es posible confirmar
                esta venta.
              </div>
            ) : cart.length ===
              0 ? (
              <div className="empty">
                El carrito está vacío.
              </div>
            ) : (
              <>
                <div
                  className="table-wrap"
                >
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          Producto
                        </th>

                        <th>
                          Cant.
                        </th>

                        <th>
                          Precio
                        </th>

                        <th>
                          Total
                        </th>

                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {cart.map(
                        (item) => (
                          <tr
                            key={
                              item
                                .product
                                .id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  item
                                    .product
                                    .name
                                }
                              </strong>

                              <div className="muted">
                                {
                                  item
                                    .product
                                    .sku
                                }
                              </div>
                            </td>

                            <td>
                              {
                                item.quantity
                              }
                            </td>

                            <td>
                              {money(
                                Number(
                                  item
                                    .product
                                    .sale_price
                                )
                              )}
                            </td>

                            <td>
                              <strong>
                                {money(
                                  Number(
                                    item
                                      .product
                                      .sale_price
                                  ) *
                                    item.quantity
                                )}
                              </strong>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() =>
                                  removeFromCart(
                                    item
                                      .product
                                      .id
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    13
                                  }
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding:
                      "14px 0",
                    borderTop:
                      "1px solid #e5e9e8",
                    borderBottom:
                      "1px solid #e5e9e8",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >
                  <span className="muted">
                    Total venta
                  </span>

                  <strong
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {money(
                      cartTotal
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div className="field">
                    <label>
                      Cliente
                    </label>

                    <select
                      value={
                        selectedCustomerId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedCustomerId(
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Cliente
                        mostrador
                      </option>

                      {customers.map(
                        (
                          customer
                        ) => (
                          <option
                            key={
                              customer.id
                            }
                            value={
                              customer.id
                            }
                          >
                            {
                              customer.full_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={
                      clearCart
                    }
                    disabled={
                      saving
                    }
                  >
                    Vaciar
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      confirmSale
                    }
                    disabled={
                      saving ||
                      !cashOpen
                    }
                  >
                    {saving
                      ? "Procesando..."
                      : "Confirmar venta"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {saleResult && (
        <div style={backdrop}>
          <div
            className="card"
            style={saleModal}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Venta POS
                </div>

                <h2>
                  Venta #
                  {
                    saleResult.sale_number ??
                    "—"
                  }
                </h2>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={
                  finishSale
                }
              >
                <X size={15} />
              </button>
            </div>

            <div
              className="grid grid-3"
              style={{
                marginBottom: 16,
              }}
            >
              <div className="card">
                <div className="muted">
                  Factura
                </div>

                <strong>
                  {
                    saleResult.invoice_number ??
                    "—"
                  }
                </strong>
              </div>

              <div className="card">
                <div className="muted">
                  Total
                </div>

                <strong
                  style={{
                    fontSize: 18,
                  }}
                >
                  {money(
                    saleTotal
                  )}
                </strong>
              </div>

              <div className="card">
                <div className="muted">
                  Estado
                </div>

                <strong>
                  {saleBalance <=
                  0
                    ? "Pagada"
                    : salePaid > 0
                    ? "Abono"
                    : "Pendiente"}
                </strong>
              </div>
            </div>

            <div
              className="grid grid-3"
              style={{
                marginBottom: 16,
              }}
            >
              <div>
                <div className="muted">
                  Total
                </div>

                <strong>
                  {money(
                    saleTotal
                  )}
                </strong>
              </div>

              <div>
                <div className="muted">
                  Pagado
                </div>

                <strong
                  style={{
                    color:
                      "#0c6b58",
                  }}
                >
                  {money(
                    salePaid
                  )}
                </strong>
              </div>

              <div>
                <div className="muted">
                  Saldo
                </div>

                <strong
                  style={{
                    color:
                      saleBalance >
                      0
                        ? "#a52222"
                        : "#0c6b58",
                  }}
                >
                  {money(
                    saleBalance
                  )}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 8,
                background:
                  "#eef8f4",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 7,
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#0c6b58"
                />

                <strong>
                  Venta registrada
                </strong>
              </div>

              <div
                className="muted"
                style={{
                  marginTop: 5,
                  fontSize: 11,
                }}
              >
                Los repuestos
                vendidos fueron
                descontados del
                inventario y la factura
                fue generada.
              </div>
            </div>

            {saleBalance > 0 ? (
              <>
                {cashOpen ? (
                  <>
                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                        marginBottom: 16,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={
                          openPayment
                        }
                        disabled={
                          loadingInvoice
                        }
                      >
                        <CreditCard
                          size={
                            14
                          }
                        />

                        {loadingInvoice
                          ? "Cargando..."
                          : "Registrar abono"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={
                          finishSale
                        }
                      >
                        Dejar pendiente
                      </button>
                    </div>

                    {showPayment &&
                      saleResult.invoice_id && (
                        <div
                          style={{
                            marginTop: 8,
                          }}
                        >
                          <InvoicePaymentPanel
                            invoiceId={
                              saleResult.invoice_id
                            }
                            total={
                              saleTotal
                            }
                            paid={
                              salePaid
                            }
                            onSuccess={
                              handlePaymentSuccess
                            }
                          />

                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              marginTop:
                                10,
                            }}
                            onClick={
                              closePayment
                            }
                          >
                            Ocultar formulario
                          </button>
                        </div>
                      )}
                  </>
                ) : (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: 14,
                      borderRadius: 8,
                      background:
                        "#fff8f8",
                      color:
                        "#a52222",
                      fontSize: 12,
                    }}
                  >
                    <strong>
                      La caja está cerrada.
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                      }}
                    >
                      No se pueden registrar
                      abonos hasta abrir una
                      nueva caja.
                    </div>

                    <a
                      href="/finanzas/caja"
                      className="btn btn-primary"
                      style={{
                        display:
                          "inline-flex",
                        marginTop: 10,
                        textDecoration:
                          "none",
                      }}
                    >
                      Abrir caja
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 8,
                  background:
                    "#e9f8f2",
                  color:
                    "#0c6b58",
                }}
              >
                <strong>
                  Factura totalmente
                  pagada.
                </strong>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                  }}
                >
                  No existe saldo
                  pendiente.
                </div>
              </div>
            )}

            {showPayment &&
              saleBalance > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 11,
                    borderRadius: 8,
                    background:
                      "#f5f7f6",
                    fontSize: 11,
                  }}
                >
                  Cada abono actualiza
                  automáticamente el
                  valor pagado y el saldo
                  de la factura.
                </div>
              )}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: 8,
                borderTop:
                  "1px solid #e5e9e8",
                paddingTop: 14,
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  finishSale
                }
              >
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 18,
  overflowY: "auto",
};

const modal: React.CSSProperties = {
  width: "min(900px,100%)",
  maxHeight:
    "calc(100vh - 36px)",
  overflowY: "auto",
};

const saleModal: React.CSSProperties = {
  width: "min(820px,100%)",
  maxHeight:
    "calc(100vh - 36px)",
  overflowY: "auto",
};