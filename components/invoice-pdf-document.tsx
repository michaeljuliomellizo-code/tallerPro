import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type PdfInvoiceItem = {
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type PdfInvoiceData = {
  invoice_number: string;
  issued_at: string;
  due_at: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  customer: {
    full_name: string;
    document_number?: string | null;
    phone: string | null;
    whatsapp?: string | null;
    email: string | null;
  } | null;
  organization: {
    name: string;
    nit?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  order: {
    order_number: number | string;
    status: string;
    received_at: string | null;
    mileage: number | string | null;
    diagnosis: string | null;
    observations: string | null;
    motorcycle: {
      plate: string;
      brand: string;
      model: string;
      year: number | null;
      current_km: number | null;
    } | null;
    mechanic: {
      full_name: string;
      specialty: string | null;
    } | null;
  } | null;
  items: PdfInvoiceItem[];
};

const C = {
  red: "#ED1743",
  aqua: "#39E7C3",
  black: "#111318",
  dark: "#26313A",
  gray: "#6B7280",
  line: "#D9DEE4",
  soft: "#F4F7F8",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 36,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
    backgroundColor: C.white,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: 300,
    left: 145,
    width: 300,
    opacity: 0.055,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.black,
  },
  logo: { width: 205, height: 105, objectFit: "contain" },
  orgBlock: { alignItems: "flex-end", marginTop: 3 },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: C.gray, marginBottom: 2 },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 19, fontFamily: "Helvetica-Bold" },
  invoiceNumber: {
    color: C.white,
    backgroundColor: C.red,
    paddingVertical: 7,
    paddingHorizontal: 11,
    fontFamily: "Helvetica-Bold",
    borderRadius: 4,
  },
  grid2: { flexDirection: "row", gap: 10, marginTop: 12 },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 5,
    padding: 10,
    minHeight: 73,
  },
  boxTitle: {
    color: C.red,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  strong: { fontFamily: "Helvetica-Bold" },
  muted: { color: C.gray, lineHeight: 1.35 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textTransform: "uppercase",
  },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 5, overflow: "hidden" },
  tr: { flexDirection: "row", minHeight: 22, borderBottomWidth: 1, borderBottomColor: C.line },
  trLast: { flexDirection: "row", minHeight: 22 },
  th: { backgroundColor: C.dark, color: C.white, fontFamily: "Helvetica-Bold" },
  cell: { padding: 6, justifyContent: "center" },
  desc: { width: "49%" },
  type: { width: "18%" },
  qty: { width: "10%", textAlign: "right" },
  unit: { width: "12%", textAlign: "right" },
  total: { width: "11%", textAlign: "right" },
  totalsWrap: { marginTop: 8, flexDirection: "row", justifyContent: "flex-end" },
  totals: { width: "48%", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 5 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { backgroundColor: C.black, color: C.white, padding: 8, borderRadius: 4, marginTop: 4 },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 19,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.gray,
    fontSize: 7.5,
  },
});

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function date(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO");
}

function itemType(value: string) {
  if (value === "part") return "Repuesto";
  if (value === "service") return "Servicio";
  return "Otro";
}

function status(value: string) {
  const map: Record<string, string> = {
    paid: "Pagada",
    pending: "Pendiente",
    partial: "Pago parcial",
    cancelled: "Anulada",
  };
  return map[value] ?? value;
}

export default function InvoicePdfDocument({ data }: { data: PdfInvoiceData }) {
  const balance = Math.max(0, data.total - data.paid);
  return (
    <Document title={`Factura ${data.invoice_number}`} author="MotoMil">
      <Page size="LETTER" style={styles.page} wrap>
        <Image src="/assets/motomil-logo.png" style={styles.watermark} fixed />

        <View style={styles.header}>
          <Image src="/assets/motomil-logo.png" style={styles.logo} />
          <View style={styles.orgBlock}>
            <Text style={styles.orgName}>{data.organization?.name || "MotoMil Taller"}</Text>
            {data.organization?.nit ? <Text style={styles.meta}>NIT: {data.organization.nit}</Text> : null}
            {data.organization?.address ? <Text style={styles.meta}>{data.organization.address}</Text> : null}
            {data.organization?.phone ? <Text style={styles.meta}>Tel: {data.organization.phone}</Text> : null}
            {data.organization?.email ? <Text style={styles.meta}>{data.organization.email}</Text> : null}
          </View>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>FACTURA DE VENTA</Text>
            <Text style={styles.muted}>Fecha de emisión: {date(data.issued_at)}</Text>
          </View>
          <Text style={styles.invoiceNumber}>{data.invoice_number}</Text>
        </View>

        <View style={styles.grid2}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Cliente</Text>
            <Text style={styles.strong}>{data.customer?.full_name || "Cliente no registrado"}</Text>
            {data.customer?.document_number ? <Text style={styles.muted}>Documento: {data.customer.document_number}</Text> : null}
            {data.customer?.phone ? <Text style={styles.muted}>Tel: {data.customer.phone}</Text> : null}
            {data.customer?.email ? <Text style={styles.muted}>{data.customer.email}</Text> : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Orden de servicio</Text>
            {data.order ? (
              <>
                <Text style={styles.strong}>OS #{data.order.order_number}</Text>
                {data.order.motorcycle ? <Text style={styles.muted}>{data.order.motorcycle.brand} {data.order.motorcycle.model} · {data.order.motorcycle.plate}</Text> : null}
                {data.order.motorcycle?.year ? <Text style={styles.muted}>Año: {data.order.motorcycle.year}</Text> : null}
                {data.order.mileage != null ? <Text style={styles.muted}>Kilometraje: {Number(data.order.mileage).toLocaleString("es-CO")} km</Text> : null}
                {data.order.mechanic ? <Text style={styles.muted}>Mecánico: {data.order.mechanic.full_name}</Text> : null}
              </>
            ) : (
              <Text style={styles.strong}>Venta directa</Text>
            )}
          </View>
        </View>

        {data.order?.diagnosis ? (
          <View style={styles.grid2}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Diagnóstico</Text>
              <Text style={styles.muted}>{data.order.diagnosis}</Text>
            </View>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Observaciones</Text>
              <Text style={styles.muted}>{data.order.observations || "-"}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Detalle de servicios y repuestos</Text>
        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={[styles.cell, styles.desc]}>Descripción</Text>
            <Text style={[styles.cell, styles.type]}>Tipo</Text>
            <Text style={[styles.cell, styles.qty]}>Cant.</Text>
            <Text style={[styles.cell, styles.unit]}>V. unit.</Text>
            <Text style={[styles.cell, styles.total]}>Total</Text>
          </View>
          {(data.items.length ? data.items : [{ description: "Servicios y conceptos de la factura", item_type: "other", quantity: 1, unit_price: data.subtotal, total: data.subtotal }]).map((item, index, arr) => (
            <View key={`${item.description}-${index}`} style={index === arr.length - 1 ? styles.trLast : styles.tr} wrap={false}>
              <Text style={[styles.cell, styles.desc]}>{item.description}</Text>
              <Text style={[styles.cell, styles.type]}>{itemType(item.item_type)}</Text>
              <Text style={[styles.cell, styles.qty]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.unit]}>{money(item.unit_price)}</Text>
              <Text style={[styles.cell, styles.total]}>{money(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalLine}><Text>Subtotal</Text><Text>{money(data.subtotal)}</Text></View>
            <View style={styles.totalLine}><Text>Impuestos</Text><Text>{money(data.tax)}</Text></View>
            <View style={styles.grandTotal}><Text style={styles.strong}>TOTAL</Text><Text style={styles.strong}>{money(data.total)}</Text></View>
            <View style={styles.totalLine}><Text>Pagado</Text><Text>{money(data.paid)}</Text></View>
            <View style={styles.totalLine}><Text>Saldo</Text><Text>{money(balance)}</Text></View>
          </View>
        </View>

        <View style={{ marginTop: 15, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.strong}>Estado: {status(data.status)}</Text>
            <Text style={styles.muted}>Vencimiento: {date(data.due_at)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.strong}>Gracias por confiar en MotoMil</Text>
            <Text style={styles.muted}>Todo el taller bajo control.</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>MotoMil Taller · Documento generado por el sistema</Text>
          <Text>{data.invoice_number}</Text>
        </View>
      </Page>
    </Document>
  );
}
