"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Eye,
  PackageCheck,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/utils";

type PosSale = {
  id: string;
  organization_id: string;
  customer_id: string | null;
  invoice_id: string | null;
  sale_number: number;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
};

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  paid: number | string;
  total: number | string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  inventory_product_id: string;
  description: string;
  quantity: number | string;
  unit_cost: number | string;
  unit_price: number | string;
  total: number | string;
};

type ReturnItemSummary = {
  sale_item_id: string;
  quantity: number | string;
  return_id: string;
};

type ReturnRecord = {
  id: string;
  sale_id: string;
  return_number: number | string;
  reason: string;
  total: number | string;
  created_at: string;
};

type ReturnDetailItem = {
  id: string;
  return_id: string;
  sale_item_id: string;
  inventory_product_id: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  total: number | string;
  created_at: string;
};

type Payment = {
  id: string;
  amount: number | string;
  method: string;
  reference: string | null;
  paid_at: string;
  reversed_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  cancelled: "Anulada",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "badge badge-warning",
  confirmed: "badge badge-success",
  cancelled: "badge badge-danger",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
  other: "Otro",
};

function getSaleStatusLabel(
  sale: PosSale,
  returnedTotal: number,
  soldTotal: number,
  availableQuantity: number
) {
  if (sale.status === "cancelled") {
    return "Anulada";
  }

  if (sale.status === "draft") {
    return "Borrador";
  }

  if (returnedTotal <= 0) {
    return "Confirmada";
  }

  if (
    availableQuantity <= 0 ||
    returnedTotal >= soldTotal
  ) {
    return "Devuelta completamente";
  }

  return "Parcialmente devuelta";
}

function getSaleStatusClass(
  sale: PosSale,
  returnedTotal: number,
  soldTotal: number,
  availableQuantity: number
) {
  if (sale.status === "cancelled") {
    return "badge badge-danger";
  }

  if (sale.status === "draft") {
    return "badge badge-warning";
  }

  if (returnedTotal <= 0) {
    return "badge badge-success";
  }

  if (
    availableQuantity <= 0 ||
    returnedTotal >= soldTotal
  ) {
    return "badge badge-danger";
  }

  return "badge badge-warning";
}

export default function PosSalesHistory() {
  const supabase = createClient();

  const [organizationId, setOrganizationId] = useState("");

  const [sales, setSales] = useState<PosSale[]>([]);
  const [customers, setCustomers] = useState<
    Record<string, Customer>
  >({});
  const [invoices, setInvoices] = useState<
    Record<string, Invoice>
  >({});

  const [returnTotals, setReturnTotals] = useState<
    Record<string, number>
  >({});

  const [returnCounts, setReturnCounts] = useState<
    Record<string, number>
  >({});

  const [selectedSale, setSelectedSale] =
    useState<PosSale | null>(null);

  const [selectedItems, setSelectedItems] =
    useState<SaleItem[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  const [selectedPayments, setSelectedPayments] =
    useState<Payment[]>([]);

  const [selectedReturns, setSelectedReturns] =
    useState<ReturnRecord[]>([]);

  const [selectedReturnItems, setSelectedReturnItems] =
    useState<ReturnDetailItem[]>([]);

  const [returnedQuantities, setReturnedQuantities] =
    useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] =
    useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [returning, setReturning] = useState(false);
  const [showReturnModal, setShowReturnModal] =
    useState(false);
  const [returnReason, setReturnReason] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  async function loadSales() {
    try {
      setLoading(true);
      setError("");

      const orgId =
        organizationId ||
        (await getCurrentOrganizationId());

      if (!orgId) {
        throw new Error(
          "El usuario autenticado no tiene una organización asignada."
        );
      }

      setOrganizationId(orgId);

      const { data, error: salesError } =
        await supabase
          .from("pos_sales")
          .select(
            `
              id,
              organization_id,
              customer_id,
              invoice_id,
              sale_number,
              subtotal,
              tax,
              total,
              status,
              created_by,
              created_at,
              updated_at,
              cancelled_at,
              cancelled_by,
              cancellation_reason
            `
          )
          .eq("organization_id", orgId)
          .order("created_at", {
            ascending: false,
          });

      if (salesError) {
        throw salesError;
      }

      const saleRows = (data ?? []) as PosSale[];

      setSales(saleRows);

      const customerIds = Array.from(
        new Set(
          saleRows
            .map((sale) => sale.customer_id)
            .filter(
              (id): id is string =>
                Boolean(id)
            )
        )
      );

      const invoiceIds = Array.from(
        new Set(
          saleRows
            .map((sale) => sale.invoice_id)
            .filter(
              (id): id is string =>
                Boolean(id)
            )
        )
      );

      if (customerIds.length > 0) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            "id, full_name, phone"
          )
          .in("id", customerIds);

        if (customerError) {
          throw customerError;
        }

        const customerMap: Record<
          string,
          Customer
        > = {};

        for (const customer of (customerData ??
          []) as Customer[]) {
          customerMap[customer.id] =
            customer;
        }

        setCustomers(customerMap);
      } else {
        setCustomers({});
      }

      if (invoiceIds.length > 0) {
        const {
          data: invoiceData,
          error: invoiceError,
        } = await supabase
          .from("invoices")
          .select(
            "id, invoice_number, status, paid, total"
          )
          .in("id", invoiceIds);

        if (invoiceError) {
          throw invoiceError;
        }

        const invoiceMap: Record<
          string,
          Invoice
        > = {};

        for (const invoice of (invoiceData ??
          []) as Invoice[]) {
          invoiceMap[invoice.id] =
            invoice;
        }

        setInvoices(invoiceMap);
      } else {
        setInvoices({});
      }

      const saleIds = saleRows.map(
        (sale) => sale.id
      );

      if (saleIds.length > 0) {
        const {
          data: returnsData,
          error: returnsError,
        } = await supabase
          .from("pos_sale_returns")
          .select(
            "id, sale_id, return_number, reason, total, created_at"
          )
          .in("sale_id", saleIds)
          .order("created_at", {
            ascending: false,
          });

        if (returnsError) {
          throw returnsError;
        }

        const totals: Record<
          string,
          number
        > = {};

        const counts: Record<
          string,
          number
        > = {};

        for (const returnRow of (returnsData ??
          []) as ReturnRecord[]) {
          totals[returnRow.sale_id] =
            (totals[returnRow.sale_id] ??
              0) +
            Number(
              returnRow.total || 0
            );

          counts[returnRow.sale_id] =
            (counts[returnRow.sale_id] ??
              0) + 1;
        }

        setReturnTotals(totals);
        setReturnCounts(counts);
      } else {
        setReturnTotals({});
        setReturnCounts({});
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el historial de ventas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(
    sale: PosSale
  ) {
    try {
      setSelectedSale(sale);
      setDetailLoading(true);
      setSelectedItems([]);
      setSelectedPayments([]);
      setSelectedReturns([]);
      setSelectedReturnItems([]);
      setReturnedQuantities({});
      setError("");
      setSuccessMessage("");

      setSelectedCustomer(
        sale.customer_id
          ? customers[sale.customer_id] ??
              null
          : null
      );

      setSelectedInvoice(
        sale.invoice_id
          ? invoices[sale.invoice_id] ??
              null
          : null
      );

      const {
        data: returnHeadersData,
        error: returnHeadersError,
      } = await supabase
        .from("pos_sale_returns")
        .select(
          `
            id,
            sale_id,
            return_number,
            reason,
            total,
            created_at
          `
        )
        .eq("sale_id", sale.id)
        .order("created_at", {
          ascending: false,
        });

      if (returnHeadersError) {
        throw returnHeadersError;
      }

      const returnHeaders =
        (returnHeadersData ??
          []) as ReturnRecord[];

      setSelectedReturns(
        returnHeaders
      );

      const returnIds =
        returnHeaders.map(
          (item) => item.id
        );

      let returnItemsData:
        | ReturnDetailItem[]
        | null = null;

      if (returnIds.length > 0) {
        const {
          data,
          error: returnItemsError,
        } = await supabase
          .from(
            "pos_sale_return_items"
          )
          .select(
            `
              id,
              return_id,
              sale_item_id,
              inventory_product_id,
              description,
              quantity,
              unit_price,
              total,
              created_at
            `
          )
          .in(
            "return_id",
            returnIds
          )
          .order("created_at", {
            ascending: true,
          });

        if (returnItemsError) {
          throw returnItemsError;
        }

        returnItemsData =
          (data ??
            []) as ReturnDetailItem[];

        setSelectedReturnItems(
          returnItemsData
        );
      }

      const {
        data: itemsData,
        error: itemsError,
      } = await supabase
        .from("pos_sale_items")
        .select(
          `
            id,
            sale_id,
            inventory_product_id,
            description,
            quantity,
            unit_cost,
            unit_price,
            total
          `
        )
        .eq("sale_id", sale.id)
        .order("created_at", {
          ascending: true,
        });

      if (itemsError) {
        throw itemsError;
      }

      const items =
        (itemsData ?? []) as SaleItem[];

      setSelectedItems(items);

      const quantities: Record<
        string,
        number
      > = {};

      for (const item of returnItemsData ??
        []) {
        quantities[item.sale_item_id] =
          (quantities[
            item.sale_item_id
          ] ?? 0) +
          Number(item.quantity);
      }

      setReturnedQuantities(
        quantities
      );

      if (sale.invoice_id) {
        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("payments")
          .select(
            `
              id,
              amount,
              method,
              reference,
              paid_at,
              reversed_at
            `
          )
          .eq(
            "invoice_id",
            sale.invoice_id
          )
          .order("paid_at", {
            ascending: true,
          });

        if (paymentError) {
          throw paymentError;
        }

        setSelectedPayments(
          (paymentData ??
            []) as Payment[]
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el detalle de la venta."
      );

      setSelectedSale(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    if (cancelling || returning) {
      return;
    }

    setSelectedSale(null);
    setSelectedItems([]);
    setSelectedCustomer(null);
    setSelectedInvoice(null);
    setSelectedPayments([]);
    setSelectedReturns([]);
    setSelectedReturnItems([]);
    setReturnedQuantities({});
    setShowCancelModal(false);
    setShowReturnModal(false);
    setCancelReason("");
    setReturnReason("");
  }

  function openCancelModal() {
    if (!selectedSale) {
      return;
    }

    if (
      selectedSale.status ===
      "cancelled"
    ) {
      setError(
        "La venta ya se encuentra anulada."
      );
      return;
    }

    setCancelReason("");
    setError("");
    setShowCancelModal(true);
  }

  function closeCancelModal() {
    if (cancelling) {
      return;
    }

    setShowCancelModal(false);
    setCancelReason("");
  }

  async function cancelSale() {
    if (!selectedSale) {
      return;
    }

    const reason =
      cancelReason.trim();

    if (!reason) {
      setError(
        "Debes indicar el motivo de la anulación."
      );
      return;
    }

    if (
      selectedSale.status ===
      "cancelled"
    ) {
      setError(
        "La venta ya se encuentra anulada."
      );
      return;
    }

    try {
      setCancelling(true);
      setError("");
      setSuccessMessage("");

      const { data, error: rpcError } =
        await supabase.rpc(
          "cancel_pos_sale",
          {
            p_sale_id:
              selectedSale.id,
            p_reason: reason,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const result = data as
        | {
            success?: boolean;
            sale_number?: number;
            cash_returned?:
              | number
              | string;
          }
        | null;

      if (!result?.success) {
        throw new Error(
          "Supabase no confirmó la anulación de la venta."
        );
      }

      const formattedSaleNumber =
        `POS-${String(
          result.sale_number ??
            selectedSale.sale_number
        ).padStart(6, "0")}`;

      const cashReturned = Number(
        result.cash_returned ?? 0
      );

      setShowCancelModal(false);
      setCancelReason("");

      closeDetail();

      setSuccessMessage(
        cashReturned > 0
          ? `${formattedSaleNumber} anulada correctamente. Se devolvieron ${money(
              cashReturned
            )} de efectivo y el inventario fue restaurado.`
          : `${formattedSaleNumber} anulada correctamente. El inventario fue restaurado.`
      );

      await loadSales();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible anular la venta."
      );
    } finally {
      setCancelling(false);
    }
  }

  function getAvailableQuantity(
    item: SaleItem
  ) {
    const sold =
      Number(item.quantity);

    const returned =
      returnedQuantities[item.id] ??
      0;

    return Math.max(
      sold - returned,
      0
    );
  }

  function getReturnTotal() {
    return selectedItems.reduce(
      (sum, item) => {
        const quantity =
          Number(
            returnedQuantities[
              item.id
            ] ?? 0
          );

        return (
          sum +
          quantity *
            Number(
              item.unit_price || 0
            )
        );
      },
      0
    );
  }

  function setReturnQuantity(
    item: SaleItem,
    value: string
  ) {
    const available =
      getAvailableQuantity(item);

    const numeric =
      Number(value);

    if (!Number.isFinite(numeric)) {
      return;
    }

    const quantity =
      Math.max(
        0,
        Math.min(
          numeric,
          available
        )
      );

    setReturnedQuantities(
      (current) => ({
        ...current,
        [item.id]: quantity,
      })
    );
  }

  function openReturnModal() {
    if (!selectedSale) {
      return;
    }

    if (
      selectedSale.status !==
      "confirmed"
    ) {
      setError(
        "Solo se pueden devolver productos de ventas confirmadas."
      );
      return;
    }

    if (
      selectedDigitalPayments.length >
      0
    ) {
      setError(
        "La venta tiene pagos digitales. El reintegro digital debe procesarse antes de realizar esta devolución."
      );
      return;
    }

    if (
      selectedAvailableForReturn <=
      0
    ) {
      setError(
        "No quedan productos disponibles para devolver de esta venta."
      );
      return;
    }

    setReturnReason("");
    setError("");
    setShowReturnModal(true);
  }

  function closeReturnModal() {
    if (returning) {
      return;
    }

    setShowReturnModal(false);
    setReturnReason("");
  }

  async function createPartialReturn() {
    if (!selectedSale) {
      return;
    }

    const reason =
      returnReason.trim();

    if (!reason) {
      setError(
        "Debes indicar el motivo de la devolución."
      );
      return;
    }

    const items = selectedItems
      .map((item) => ({
        sale_item_id: item.id,
        quantity: Number(
          returnedQuantities[item.id] ??
            0
        ),
      }))
      .filter(
        (item) => item.quantity > 0
      );

    if (items.length === 0) {
      setError(
        "Selecciona al menos un producto y una cantidad para devolver."
      );
      return;
    }

    const total =
      getReturnTotal();

    if (total <= 0) {
      setError(
        "El valor total de la devolución debe ser mayor que cero."
      );
      return;
    }

    const activePayments =
      selectedPayments.filter(
        (payment) =>
          payment.reversed_at ===
          null
      );

    const digitalPayments =
      activePayments.filter(
        (payment) =>
          payment.method !==
          "cash"
      );

    if (
      digitalPayments.length >
      0
    ) {
      setError(
        "Esta venta tiene pagos digitales. El reintegro digital debe procesarse antes de realizar esta devolución."
      );
      return;
    }

    const cashPaid =
      activePayments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount),
        0
      );

    if (total > cashPaid) {
      setError(
        `El valor de la devolución (${money(
          total
        )}) supera el efectivo disponible (${money(
          cashPaid
        )}).`
      );
      return;
    }

    try {
      setReturning(true);
      setError("");
      setSuccessMessage("");

      const { data, error: rpcError } =
        await supabase.rpc(
          "create_pos_partial_return",
          {
            p_sale_id:
              selectedSale.id,
            p_reason: reason,
            p_items: items,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const result = data as
        | {
            success?: boolean;
            sale_number?: number;
            return_number?:
              | number
              | string;
            returned_total?:
              | number
              | string;
          }
        | null;

      if (!result?.success) {
        throw new Error(
          "Supabase no confirmó la devolución."
        );
      }

      const saleNumber =
        String(
          result.sale_number ??
            selectedSale.sale_number
        ).padStart(
          6,
          "0"
        );

      const returnNumber =
        String(
          result.return_number ??
            ""
        ).padStart(
          6,
          "0"
        );

      const returnedTotal =
        Number(
          result.returned_total ??
            total
        );

      closeReturnModal();
      closeDetail();

      setSuccessMessage(
        `Devolución DEV-${returnNumber} registrada para POS-${saleNumber} por ${money(
          returnedTotal
        )}. El inventario y la caja fueron actualizados.`
      );

      await loadSales();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la devolución."
      );
    } finally {
      setReturning(false);
    }
  }

  useEffect(() => {
    void loadSales();
  }, []);

  const filteredSales =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return sales.filter(
        (sale) => {
          const customer =
            sale.customer_id
              ? customers[
                  sale.customer_id
                ]
              : null;

          const invoice =
            sale.invoice_id
              ? invoices[
                  sale.invoice_id
                ]
              : null;

          const saleNumber =
            String(
              sale.sale_number
            );

          const invoiceNumber =
            invoice?.invoice_number ??
            "";

          const customerName =
            customer?.full_name ??
            "";

          const customerPhone =
            customer?.phone ?? "";

          const returnedTotal =
            returnTotals[
              sale.id
            ] ?? 0;

          const saleTotal =
            Number(
              sale.total || 0
            );

          const netTotal =
            Math.max(
              saleTotal -
                returnedTotal,
              0
            );

          const matchesSearch =
            !term ||
            saleNumber
              .toLowerCase()
              .includes(term) ||
            invoiceNumber
              .toLowerCase()
              .includes(term) ||
            customerName
              .toLowerCase()
              .includes(term) ||
            customerPhone
              .toLowerCase()
              .includes(term) ||
            money(
              netTotal
            )
              .toLowerCase()
              .includes(term);

          const statusLabel =
            getSaleStatusLabel(
              sale,
              returnedTotal,
              returnedTotal +
                netTotal,
              1
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "returned" &&
              returnedTotal >
                0 &&
              sale.status !==
                "cancelled") ||
            (statusFilter ===
              "confirmed" &&
              sale.status ===
                "confirmed" &&
              returnedTotal ===
                0) ||
            (statusFilter ===
              "cancelled" &&
              sale.status ===
                "cancelled") ||
            (statusFilter ===
              "draft" &&
              sale.status ===
                "draft") ||
            (statusFilter ===
              "fully_returned" &&
              returnedTotal >=
                saleTotal &&
              sale.status !==
                "cancelled");

          return (
            matchesSearch &&
            matchesStatus &&
            Boolean(statusLabel)
          );
        }
      );
    }, [
      sales,
      customers,
      invoices,
      returnTotals,
      search,
      statusFilter,
    ]);

  const totalSales =
    sales.length;

  const confirmedSales =
    sales.filter(
      (sale) =>
        sale.status ===
        "confirmed"
    ).length;

  const cancelledSales =
    sales.filter(
      (sale) =>
        sale.status ===
        "cancelled"
    ).length;

  const returnedSales =
    sales.filter(
      (sale) =>
        sale.status !==
          "cancelled" &&
        (returnTotals[
          sale.id
        ] ?? 0) > 0
    ).length;

  const totalConfirmed =
    sales
      .filter(
        (sale) =>
          sale.status ===
          "confirmed"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Math.max(
            Number(
              sale.total || 0
            ) -
              (returnTotals[
                sale.id
              ] ?? 0),
            0
          ),
        0
      );

  const selectedReturnTotal =
    selectedSale
      ? getReturnTotal()
      : 0;

  const selectedReturnedTotal =
    selectedSale
      ? returnTotals[
          selectedSale.id
        ] ?? 0
      : 0;

  const selectedOriginalTotal =
    selectedSale
      ? Number(
          selectedSale.total ||
            0
        )
      : 0;

  const selectedNetTotal =
    Math.max(
      selectedOriginalTotal -
        selectedReturnedTotal,
      0
    );

  const activeSelectedPayments =
    selectedPayments.filter(
      (payment) =>
        payment.reversed_at ===
        null
    );

  const selectedDigitalPayments =
    activeSelectedPayments.filter(
      (payment) =>
        payment.method !==
        "cash"
    );

  const selectedAvailableForReturn =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        getAvailableQuantity(item),
      0
    );

  const selectedAllItemsReturned =
    selectedItems.length > 0 &&
    selectedItems.every(
      (item) =>
        getAvailableQuantity(
          item
        ) <= 0
    );

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Link
              href="/pos"
              className="btn btn-secondary"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 6,
              }}
            >
              <ArrowLeft
                size={15}
              />
              POS
            </Link>
          </div>

          <h1>
            Historial de ventas
          </h1>

          <p className="muted">
            Consulta ventas,
            devoluciones y
            movimientos asociados
            al punto de venta.
          </p>
        </div>

        <Link
          href="/pos"
          className="btn btn-primary"
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            gap: 7,
          }}
        >
          <ShoppingBag
            size={16}
          />
          Nueva venta
        </Link>
      </div>

      {successMessage && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border:
              "1px solid #b9e4d8",
            background:
              "#effaf6",
            color:
              "#0c6b58",
          }}
        >
          <strong>
            Operación realizada
          </strong>

          <div
            style={{
              marginTop: 4,
            }}
          >
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border:
              "1px solid #f2b8b8",
            background:
              "#fff5f5",
            color:
              "#9b1c1c",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="grid grid-4"
        style={{
          marginBottom: 16,
        }}
      >
        <div className="card">
          <div className="muted">
            Ventas registradas
          </div>

          <strong
            style={{
              fontSize: 24,
            }}
          >
            {totalSales}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Ventas confirmadas
          </div>

          <strong
            style={{
              fontSize: 24,
              color: "#0c6b58",
            }}
          >
            {confirmedSales}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Con devoluciones
          </div>

          <strong
            style={{
              fontSize: 24,
              color: "#755b13",
            }}
          >
            {returnedSales}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Total neto
          </div>

          <strong
            style={{
              fontSize: 24,
            }}
          >
            {money(
              totalConfirmed
            )}
          </strong>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display:
              "flex",
            gap: 10,
            flexWrap:
              "wrap",
            alignItems:
              "center",
          }}
        >
          <div
            style={{
              flex:
                "1 1 320px",
              position:
                "relative",
            }}
          >
            <Search
              size={16}
              style={{
                position:
                  "absolute",
                left: 12,
                top: 12,
                opacity:
                  0.55,
              }}
            />

            <input
              value={
                search
              }
              onChange={(e) =>
                setSearch(
                  e.target
                    .value
                )
              }
              placeholder="Buscar por venta, factura, cliente..."
              style={{
                width:
                  "100%",
                paddingLeft:
                  36,
              }}
            />
          </div>

          <select
            value={
              statusFilter
            }
            onChange={(e) =>
              setStatusFilter(
                e.target
                  .value
              )
            }
            style={{
              minWidth:
                210,
            }}
          >
            <option value="all">
              Todos los estados
            </option>

            <option value="confirmed">
              Confirmadas
            </option>

            <option value="returned">
              Con devoluciones
            </option>

            <option value="fully_returned">
              Devueltas completamente
            </option>

            <option value="cancelled">
              Anuladas
            </option>

            <option value="draft">
              Borradores
            </option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>
              Ventas
            </h2>

            <div className="muted">
              {
                filteredSales.length
              }{" "}
              resultado
              {filteredSales.length ===
              1
                ? ""
                : "s"}
            </div>
          </div>
        </div>

        {loading ? (
          <div
            className="muted"
            style={{
              padding: 20,
            }}
          >
            Cargando historial de
            ventas...
          </div>
        ) : filteredSales.length ===
          0 ? (
          <div
            style={{
              padding: 30,
              textAlign:
                "center",
            }}
          >
            <ShoppingBag
              size={28}
              style={{
                opacity:
                  0.4,
              }}
            />

            <div
              style={{
                marginTop:
                  10,
              }}
            >
              <strong>
                No hay ventas
                para mostrar
              </strong>
            </div>

            <div
              className="muted"
              style={{
                marginTop:
                  5,
              }}
            >
              Ajusta los filtros
              o registra una
              nueva venta desde
              el POS.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Venta
                  </th>
                  <th>
                    Fecha
                  </th>
                  <th>
                    Cliente
                  </th>
                  <th>
                    Factura
                  </th>
                  <th>
                    Original
                  </th>
                  <th>
                    Devuelto
                  </th>
                  <th>
                    Neto
                  </th>
                  <th>
                    Estado
                  </th>
                  <th
                    style={{
                      textAlign:
                        "right",
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.map(
                  (sale) => {
                    const customer =
                      sale.customer_id
                        ? customers[
                            sale
                              .customer_id
                          ]
                        : null;

                    const invoice =
                      sale.invoice_id
                        ? invoices[
                            sale
                              .invoice_id
                          ]
                        : null;

                    const originalTotal =
                      Number(
                        sale.total ||
                          0
                      );

                    const returnedTotal =
                      returnTotals[
                        sale.id
                      ] ?? 0;

                    const netTotal =
                      Math.max(
                        originalTotal -
                          returnedTotal,
                        0
                      );

                    const availableQuantity =
                      returnedTotal >
                      0
                        ? 0
                        : 1;

                    const statusLabel =
                      sale.status ===
                      "cancelled"
                        ? "Anulada"
                        : returnedTotal >=
                            originalTotal &&
                          originalTotal >
                            0
                        ? "Devuelta completamente"
                        : returnedTotal >
                            0
                        ? "Parcialmente devuelta"
                        : STATUS_LABELS[
                            sale.status
                          ] ||
                          sale.status;

                    const statusClass =
                      sale.status ===
                      "cancelled"
                        ? "badge badge-danger"
                        : returnedTotal >=
                            originalTotal &&
                          originalTotal >
                            0
                        ? "badge badge-danger"
                        : returnedTotal >
                            0
                        ? "badge badge-warning"
                        : STATUS_CLASS[
                            sale.status
                          ] ||
                          "badge";

                    return (
                      <tr
                        key={
                          sale.id
                        }
                      >
                        <td>
                          <strong>
                            POS-
                            {String(
                              sale.sale_number
                            ).padStart(
                              6,
                              "0"
                            )}
                          </strong>

                          {returnCounts[
                            sale.id
                          ] ? (
                            <div
                              className="muted"
                              style={{
                                marginTop:
                                  3,
                              }}
                            >
                              {
                                returnCounts[
                                  sale.id
                                ]
                              }{" "}
                              devolución
                              {returnCounts[
                                sale.id
                              ] ===
                              1
                                ? ""
                                : "es"}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          {new Date(
                            sale.created_at
                          ).toLocaleString(
                            "es-CO"
                          )}
                        </td>

                        <td>
                          {customer?.full_name ||
                            "Consumidor Final"}

                          {customer?.phone && (
                            <div className="muted">
                              {
                                customer.phone
                              }
                            </div>
                          )}
                        </td>

                        <td>
                          {
                            invoice?.invoice_number ||
                            "—"
                          }
                        </td>

                        <td>
                          {money(
                            originalTotal
                          )}
                        </td>

                        <td>
                          {returnedTotal >
                          0
                            ? money(
                                returnedTotal
                              )
                            : "—"}
                        </td>

                        <td>
                          <strong>
                            {money(
                              netTotal
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              statusClass
                            }
                          >
                            {
                              statusLabel
                            }
                          </span>
                        </td>

                        <td
                          style={{
                            textAlign:
                              "right",
                          }}
                        >
                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              void openDetail(
                                sale
                              )
                            }
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap: 6,
                            }}
                          >
                            <Eye
                              size={
                                14
                              }
                            />
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.45)",
            zIndex: 1000,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
          }}
          onClick={
            closeDetail
          }
        >
          <div
            className="card"
            style={{
              width:
                "min(1050px, 100%)",
              maxHeight:
                "90vh",
              overflow:
                "auto",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 12,
                marginBottom:
                  18,
              }}
            >
              <div>
                <h2
                  style={{
                    marginBottom:
                      4,
                  }}
                >
                  Venta POS-
                  {String(
                    selectedSale.sale_number
                  ).padStart(
                    6,
                    "0"
                  )}
                </h2>

                <div className="muted">
                  {new Date(
                    selectedSale.created_at
                  ).toLocaleString(
                    "es-CO"
                  )}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={
                  closeDetail
                }
                disabled={
                  cancelling ||
                  returning
                }
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="muted">
                Cargando detalle...
              </div>
            ) : (
              <>
                {selectedSale.status ===
                  "cancelled" && (
                  <div
                    style={{
                      marginBottom:
                        18,
                      padding: 14,
                      border:
                        "1px solid #f2b8b8",
                      borderRadius:
                        8,
                      background:
                        "#fff5f5",
                      color:
                        "#9b1c1c",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        gap: 9,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <Ban
                        size={18}
                        style={{
                          marginTop:
                            2,
                          flexShrink:
                            0,
                        }}
                      />

                      <div>
                        <strong>
                          Venta anulada
                        </strong>

                        <div
                          style={{
                            marginTop:
                              5,
                          }}
                        >
                          {selectedSale.cancellation_reason ||
                            "Sin motivo registrado."}
                        </div>

                        {selectedSale.cancelled_at && (
                          <div
                            className="muted"
                            style={{
                              marginTop:
                                5,
                            }}
                          >
                            Anulada el{" "}
                            {new Date(
                              selectedSale.cancelled_at
                            ).toLocaleString(
                              "es-CO"
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="grid grid-4"
                  style={{
                    marginBottom:
                      18,
                  }}
                >
                  <div className="card">
                    <div className="muted">
                      Total original
                    </div>

                    <strong
                      style={{
                        fontSize:
                          20,
                      }}
                    >
                      {money(
                        selectedOriginalTotal
                      )}
                    </strong>
                  </div>

                  <div className="card">
                    <div className="muted">
                      Total devuelto
                    </div>

                    <strong
                      style={{
                        fontSize:
                          20,
                        color:
                          "#a52222",
                      }}
                    >
                      {money(
                        selectedReturnedTotal
                      )}
                    </strong>
                  </div>

                  <div className="card">
                    <div className="muted">
                      Total neto
                    </div>

                    <strong
                      style={{
                        fontSize:
                          20,
                        color:
                          "#0c6b58",
                      }}
                    >
                      {money(
                        selectedNetTotal
                      )}
                    </strong>
                  </div>

                  <div className="card">
                    <div className="muted">
                      Estado
                    </div>

                    <div
                      style={{
                        marginTop:
                          6,
                      }}
                    >
                      <span
                        className={
                          getSaleStatusClass(
                            selectedSale,
                            selectedReturnedTotal,
                            selectedOriginalTotal,
                            selectedAvailableForReturn
                          )
                        }
                      >
                        {
                          getSaleStatusLabel(
                            selectedSale,
                            selectedReturnedTotal,
                            selectedOriginalTotal,
                            selectedAvailableForReturn
                          )
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="grid grid-3"
                  style={{
                    marginBottom:
                      18,
                  }}
                >
                  <div className="card">
                    <div className="muted">
                      Cliente
                    </div>

                    <strong>
                      {selectedCustomer?.full_name ||
                        "Consumidor Final"}
                    </strong>

                    {selectedCustomer?.phone && (
                      <div className="muted">
                        {
                          selectedCustomer.phone
                        }
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="muted">
                      Factura
                    </div>

                    <strong>
                      {selectedInvoice?.invoice_number ||
                        "—"}
                    </strong>

                    {selectedInvoice && (
                      <div className="muted">
                        Estado:{" "}
                        {
                          selectedInvoice.status
                        }
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="muted">
                      Devoluciones
                    </div>

                    <strong
                      style={{
                        fontSize:
                          20,
                      }}
                    >
                      {selectedReturns.length}
                    </strong>

                    <div className="muted">
                      devolución
                      {selectedReturns.length ===
                      1
                        ? ""
                        : "es"}
                    </div>
                  </div>
                </div>

                {selectedPayments.length >
                  0 && (
                  <div
                    className="card"
                    style={{
                      marginBottom:
                        18,
                    }}
                  >
                    <div className="section-head">
                      <div>
                        <h3>
                          Pagos
                        </h3>

                        <div className="muted">
                          Pagos registrados
                          para esta venta.
                        </div>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>
                              Fecha
                            </th>
                            <th>
                              Método
                            </th>
                            <th>
                              Referencia
                            </th>
                            <th>
                              Estado
                            </th>
                            <th>
                              Valor
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedPayments.map(
                            (
                              payment
                            ) => (
                              <tr
                                key={
                                  payment.id
                                }
                              >
                                <td>
                                  {new Date(
                                    payment.paid_at
                                  ).toLocaleString(
                                    "es-CO"
                                  )}
                                </td>

                                <td>
                                  {PAYMENT_METHOD_LABELS[
                                    payment
                                      .method
                                  ] ||
                                    payment.method}
                                </td>

                                <td>
                                  {payment.reference ||
                                    "—"}
                                </td>

                                <td>
                                  {payment.reversed_at ? (
                                    <span className="badge badge-danger">
                                      Revertido
                                    </span>
                                  ) : (
                                    <span className="badge badge-success">
                                      Activo
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <strong>
                                    {money(
                                      Number(
                                        payment.amount ||
                                          0
                                      )
                                    )}
                                  </strong>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div
                  className="card"
                  style={{
                    marginBottom:
                      18,
                  }}
                >
                  <div className="section-head">
                    <div>
                      <h3>
                        Productos
                      </h3>

                      <div className="muted">
                        Cantidades vendidas,
                        devueltas y aún
                        disponibles.
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Producto
                          </th>
                          <th>
                            Vendido
                          </th>
                          <th>
                            Devuelto
                          </th>
                          <th>
                            Disponible
                          </th>
                          <th>
                            Precio
                          </th>
                          <th>
                            Valor original
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedItems.map(
                          (item) => {
                            const returned =
                              returnedQuantities[
                                item.id
                              ] ?? 0;

                            const available =
                              getAvailableQuantity(
                                item
                              );

                            return (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td>
                                  {
                                    item.description
                                  }
                                </td>

                                <td>
                                  {Number(
                                    item.quantity
                                  )}
                                </td>

                                <td>
                                  {
                                    returned
                                  }
                                </td>

                                <td>
                                  <strong
                                    style={{
                                      color:
                                        available >
                                        0
                                          ? "#0c6b58"
                                          : "#a52222",
                                    }}
                                  >
                                    {
                                      available
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {money(
                                    Number(
                                      item.unit_price ||
                                        0
                                    )
                                  )}
                                </td>

                                <td>
                                  {money(
                                    Number(
                                      item.total ||
                                        0
                                    )
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedReturns.length >
                  0 && (
                  <div
                    className="card"
                    style={{
                      marginBottom:
                        18,
                    }}
                  >
                    <div className="section-head">
                      <div>
                        <h3>
                          Historial de
                          devoluciones
                        </h3>

                        <div className="muted">
                          Todas las
                          devoluciones
                          registradas para
                          esta venta.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gap: 12,
                      }}
                    >
                      {selectedReturns.map(
                        (returnRow) => {
                          const items =
                            selectedReturnItems.filter(
                              (item) =>
                                item.return_id ===
                                returnRow.id
                            );

                          return (
                            <div
                              key={
                                returnRow.id
                              }
                              style={{
                                padding:
                                  14,
                                border:
                                  "1px solid #e2e2e2",
                                borderRadius:
                                  8,
                                background:
                                  "#fafafa",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  gap: 12,
                                  alignItems:
                                    "flex-start",
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <div>
                                  <strong>
                                    DEV-
                                    {String(
                                      returnRow.return_number
                                    ).padStart(
                                      6,
                                      "0"
                                    )}
                                  </strong>

                                  <div
                                    className="muted"
                                    style={{
                                      marginTop:
                                        4,
                                    }}
                                  >
                                    {new Date(
                                      returnRow.created_at
                                    ).toLocaleString(
                                      "es-CO"
                                    )}
                                  </div>
                                </div>

                                <strong
                                  style={{
                                    color:
                                      "#a52222",
                                  }}
                                >
                                  {money(
                                    Number(
                                      returnRow.total ||
                                        0
                                    )
                                  )}
                                </strong>
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    10,
                                }}
                              >
                                <div className="muted">
                                  Motivo
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      3,
                                  }}
                                >
                                  {
                                    returnRow.reason
                                  }
                                </div>
                              </div>

                              {items.length >
                                0 && (
                                <div
                                  style={{
                                    marginTop:
                                      12,
                                  }}
                                  className="table-wrap"
                                >
                                  <table>
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
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {items.map(
                                        (
                                          item
                                        ) => (
                                          <tr
                                            key={
                                              item.id
                                            }
                                          >
                                            <td>
                                              {
                                                item.description
                                              }
                                            </td>

                                            <td>
                                              {Number(
                                                item.quantity
                                              )}
                                            </td>

                                            <td>
                                              {money(
                                                Number(
                                                  item.unit_price ||
                                                    0
                                                )
                                              )}
                                            </td>

                                            <td>
                                              <strong>
                                                {money(
                                                  Number(
                                                    item.total ||
                                                      0
                                                  )
                                                )}
                                              </strong>
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    flexWrap:
                      "wrap",
                    alignItems:
                      "flex-end",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 8,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {selectedSale.status ===
                        "confirmed" &&
                      !selectedAllItemsReturned &&
                      selectedAvailableForReturn >
                        0 && (
                        <button
                          className="btn btn-secondary"
                          onClick={
                            openReturnModal
                          }
                          disabled={
                            returning
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 7,
                            border:
                              "1px solid #b77a00",
                            color:
                              "#755b13",
                            background:
                              "#fff8e8",
                          }}
                        >
                          <PackageCheck
                            size={
                              15
                            }
                          />
                          Devolver
                          productos
                        </button>
                      )}

                    {selectedSale.status ===
                      "confirmed" && (
                      <button
                        className="btn"
                        onClick={
                          openCancelModal
                        }
                        disabled={
                          cancelling
                        }
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: 7,
                          border:
                            "1px solid #d9534f",
                          color:
                            "#a52222",
                          background:
                            "#fff5f5",
                        }}
                      >
                        <Ban
                          size={15}
                        />
                        Anular venta
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      width: 340,
                      display:
                        "grid",
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                      }}
                    >
                      <span className="muted">
                        Subtotal
                      </span>

                      <strong>
                        {money(
                          Number(
                            selectedSale.subtotal ||
                              0
                          )
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                      }}
                    >
                      <span className="muted">
                        Impuestos
                      </span>

                      <strong>
                        {money(
                          Number(
                            selectedSale.tax ||
                              0
                          )
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                      }}
                    >
                      <span className="muted">
                        Original
                      </span>

                      <strong>
                        {money(
                          selectedOriginalTotal
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        color:
                          "#a52222",
                      }}
                    >
                      <span>
                        Devoluciones
                      </span>

                      <strong>
                        {money(
                          selectedReturnedTotal
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        borderTop:
                          "1px solid #ddd",
                        paddingTop:
                          10,
                        fontSize:
                          18,
                      }}
                    >
                      <span>
                        Total neto
                      </span>

                      <strong
                        style={{
                          color:
                            "#0c6b58",
                        }}
                      >
                        {money(
                          selectedNetTotal
                        )}
                      </strong>
                    </div>

                    {selectedInvoice && (
                      <>
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                          }}
                        >
                          <span className="muted">
                            Pagado
                          </span>

                          <strong>
                            {money(
                              Number(
                                selectedInvoice.paid ||
                                  0
                              )
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                          }}
                        >
                          <span className="muted">
                            Saldo
                          </span>

                          <strong>
                            {money(
                              Math.max(
                                Number(
                                  selectedInvoice.total ||
                                    0
                                ) -
                                  Number(
                                    selectedInvoice.paid ||
                                      0
                                  ),
                                0
                              )
                            )}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showReturnModal &&
        selectedSale && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,.55)",
              zIndex: 1100,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: 20,
            }}
            onClick={
              closeReturnModal
            }
          >
            <div
              className="card"
              style={{
                width:
                  "min(760px, 100%)",
                maxHeight:
                  "90vh",
                overflow:
                  "auto",
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius:
                        8,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      background:
                        "#fff8e8",
                      color:
                        "#755b13",
                    }}
                  >
                    <PackageCheck
                      size={20}
                    />
                  </div>

                  <div>
                    <h2
                      style={{
                        marginBottom:
                          4,
                      }}
                    >
                      Devolver productos
                    </h2>

                    <div className="muted">
                      POS-
                      {String(
                        selectedSale.sale_number
                      ).padStart(
                        6,
                        "0"
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    returning
                  }
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    18,
                  padding: 14,
                  borderRadius:
                    8,
                  border:
                    "1px solid #efd28a",
                  background:
                    "#fff8e8",
                  color:
                    "#755b13",
                  fontSize:
                    13,
                }}
              >
                <strong>
                  Selecciona las cantidades a
                  devolver.
                </strong>

                <div
                  style={{
                    marginTop:
                      5,
                    lineHeight:
                      1.5,
                  }}
                >
                  El inventario será
                  restaurado y el
                  valor de la
                  devolución quedará
                  registrado como una
                  salida de caja.
                </div>

                {selectedDigitalPayments.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        10,
                      padding: 10,
                      borderRadius:
                        7,
                      background:
                        "#fff0f0",
                      border:
                        "1px solid #f2b8b8",
                      color:
                        "#9b1c1c",
                    }}
                  >
                    Esta venta tiene
                    pagos digitales.
                    Debes procesar el
                    reintegro digital
                    antes de realizar
                    esta devolución.
                  </div>
                )}
              </div>

              <div
                className="table-wrap"
                style={{
                  marginTop:
                    18,
                }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>
                        Producto
                      </th>
                      <th>
                        Vendido
                      </th>
                      <th>
                        Disponible
                      </th>
                      <th>
                        Precio
                      </th>
                      <th>
                        Cantidad
                      </th>
                      <th>
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedItems.map(
                      (item) => {
                        const available =
                          getAvailableQuantity(
                            item
                          );

                        const quantity =
                          Number(
                            returnedQuantities[
                              item.id
                            ] ?? 0
                          );

                        return (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              {
                                item.description
                              }
                            </td>

                            <td>
                              {Number(
                                item.quantity
                              )}
                            </td>

                            <td>
                              {
                                available
                              }
                            </td>

                            <td>
                              {money(
                                Number(
                                  item.unit_price ||
                                    0
                                )
                              )}
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                max={
                                  available
                                }
                                step="0.01"
                                value={
                                  quantity ||
                                  ""
                                }
                                disabled={
                                  returning ||
                                  available <=
                                    0
                                }
                                onChange={(
                                  e
                                ) =>
                                  setReturnQuantity(
                                    item,
                                    e.target
                                      .value
                                  )
                                }
                                style={{
                                  width: 100,
                                }}
                              />
                            </td>

                            <td>
                              <strong>
                                {money(
                                  quantity *
                                    Number(
                                      item.unit_price ||
                                        0
                                    )
                                )}
                              </strong>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop:
                    18,
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      7,
                    fontWeight:
                      600,
                  }}
                >
                  Motivo de la
                  devolución
                </label>

                <textarea
                  value={
                    returnReason
                  }
                  onChange={(e) =>
                    setReturnReason(
                      e.target
                        .value
                    )
                  }
                  placeholder="Ejemplo: Producto defectuoso o devolución solicitada por el cliente."
                  rows={4}
                  disabled={
                    returning
                  }
                  style={{
                    width:
                      "100%",
                    resize:
                      "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop:
                    18,
                  padding: 14,
                  borderRadius:
                    8,
                  background:
                    "#f7f7f7",
                  border:
                    "1px solid #ddd",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                }}
              >
                <div>
                  <div className="muted">
                    Total a devolver
                  </div>

                  <strong
                    style={{
                      fontSize:
                        22,
                    }}
                  >
                    {money(
                      selectedReturnTotal
                    )}
                  </strong>
                </div>

                <div
                  className="muted"
                  style={{
                    textAlign:
                      "right",
                    fontSize:
                      12,
                  }}
                >
                  Caja:
                  <br />
                  salida por devolución
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  marginTop:
                    18,
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    returning
                  }
                >
                  Cancelar
                </button>

                <button
                  className="btn"
                  onClick={() =>
                    void createPartialReturn()
                  }
                  disabled={
                    returning ||
                    !returnReason.trim() ||
                    selectedReturnTotal <=
                      0 ||
                    selectedDigitalPayments.length >
                      0
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: 7,
                    background:
                      "#b77a00",
                    color:
                      "#fff",
                    border:
                      "1px solid #b77a00",
                  }}
                >
                  <PackageCheck
                    size={15}
                  />

                  {returning
                    ? "Procesando..."
                    : "Confirmar devolución"}
                </button>
              </div>
            </div>
          </div>
        )}

      {showCancelModal &&
        selectedSale && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,.55)",
              zIndex: 1100,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: 20,
            }}
            onClick={
              closeCancelModal
            }
          >
            <div
              className="card"
              style={{
                width:
                  "min(560px, 100%)",
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "flex-start",
                  justifyContent:
                    "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius:
                        8,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      background:
                        "#fff1f1",
                      color:
                        "#a52222",
                    }}
                  >
                    <AlertTriangle
                      size={20}
                    />
                  </div>

                  <div>
                    <h2
                      style={{
                        marginBottom:
                          4,
                      }}
                    >
                      Anular venta
                    </h2>

                    <div className="muted">
                      POS-
                      {String(
                        selectedSale.sale_number
                      ).padStart(
                        6,
                        "0"
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={
                    closeCancelModal
                  }
                  disabled={
                    cancelling
                  }
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    18,
                  padding: 14,
                  borderRadius:
                    8,
                  background:
                    "#fff8e8",
                  border:
                    "1px solid #efd28a",
                  color:
                    "#755b13",
                  fontSize:
                    13,
                }}
              >
                <strong>
                  Esta operación no se
                  puede deshacer
                  automáticamente.
                </strong>

                <div
                  style={{
                    marginTop:
                      5,
                    lineHeight:
                      1.5,
                  }}
                >
                  Se devolverán los
                  productos al inventario,
                  se revertirán los pagos y
                  se registrará el ajuste
                  correspondiente en caja.
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    18,
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      7,
                    fontWeight:
                      600,
                  }}
                >
                  Motivo de la
                  anulación
                </label>

                <textarea
                  value={
                    cancelReason
                  }
                  onChange={(e) =>
                    setCancelReason(
                      e.target
                        .value
                    )
                  }
                  placeholder="Ejemplo: Cliente solicitó devolución total de la compra."
                  rows={4}
                  disabled={
                    cancelling
                  }
                  style={{
                    width:
                      "100%",
                    resize:
                      "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  marginTop:
                    18,
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={
                    closeCancelModal
                  }
                  disabled={
                    cancelling
                  }
                >
                  Cancelar
                </button>

                <button
                  className="btn"
                  onClick={() =>
                    void cancelSale()
                  }
                  disabled={
                    cancelling ||
                    !cancelReason.trim()
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: 7,
                    background:
                      "#a52222",
                    color:
                      "#fff",
                    border:
                      "1px solid #a52222",
                  }}
                >
                  <Ban size={15} />

                  {cancelling
                    ? "Anulando..."
                    : "Confirmar anulación"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}