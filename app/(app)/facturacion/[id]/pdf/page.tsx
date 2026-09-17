"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const [id, setId] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((value) => setId(value.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .single();
        if (invoiceError) throw invoiceError;

        const [{ data: customer }, { data: order }, { data: organization }] = await Promise.all([
          invoice.customer_id
            ? supabase.from("customers").select("full_name,document_number,phone,whatsapp,email").eq("id", invoice.customer_id).maybeSingle()
            : Promise.resolve({ data: null }),
          invoice.service_order_id
            ? supabase.from("service_orders").select(`order_number,status,received_at,mileage,diagnosis,observations,organization_id,motorcycle:motorcycles(plate,brand,model,year,current_km),mechanic:mechanics(full_name,specialty)`).eq("id", invoice.service_order_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("organizations").select("name,legal_name,tax_id,phone,email,address,city,country,currency").eq("id", invoice.organization_id).maybeSingle(),
        ]);

        const items = invoice.service_order_id
          ? (await supabase.from("service_order_items").select("description,item_type,quantity,unit_price").eq("service_order_id", invoice.service_order_id).order("created_at", { ascending: true })).data ?? []
          : [];

        const esc = (v: unknown) => String(v ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\\"": "&quot;" }[c] ?? c));
        const money = (v: unknown) => Number(v || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
        const date = (v: string | null) => v ? new Date(v).toLocaleDateString("es-CO") : "-";
        const rowHtml = (items.length ? items : [{ description: "Servicios y conceptos de la factura", item_type: "other", quantity: 1, unit_price: Number(invoice.subtotal) }]).map((item: any) => {
          const total = Number(item.quantity || 0) * Number(item.unit_price || 0);
          return `<tr><td>${esc(item.description)}</td><td>${esc(item.item_type === "part" ? "Repuesto" : item.item_type === "service" ? "Servicio" : "Otro")}</td><td class="r">${esc(item.quantity)}</td><td class="r">${money(item.unit_price)}</td><td class="r">${money(total)}</td></tr>`;
        }).join("");
        const balance = Math.max(0, Number(invoice.total) - Number(invoice.paid));
        const motorcycle = Array.isArray((order as any)?.motorcycle) ? (order as any).motorcycle[0] : (order as any)?.motorcycle;
        const mechanic = Array.isArray((order as any)?.mechanic) ? (order as any).mechanic[0] : (order as any)?.mechanic;

        setHtml(`
          <div class="sheet">
            <img class="watermark" src="/assets/motomil-logo.png" alt="" />
            <header><img class="logo" src="/assets/motomil-logo.png" alt="MotoMil"/><div class="org"><h2>${esc((organization as any)?.legal_name || (organization as any)?.name || "MotoMil Taller")}</h2><div>${esc((organization as any)?.tax_id ? `NIT: ${(organization as any).tax_id}` : "Taller de motocicletas")}</div><div>${esc((organization as any)?.address || "Servicio técnico especializado")}</div>${(organization as any)?.phone ? `<div>Tel: ${esc((organization as any).phone)}</div>` : ""}</div></header>
            <div class="title"><div><h1>FACTURA DE VENTA</h1><div>Fecha de emisión: ${esc(date(invoice.issued_at))}</div></div><div class="number">${esc(invoice.invoice_number)}</div></div>
            <section class="grid"><article><h3>Cliente</h3><strong>${esc(customer?.full_name || "Cliente no registrado")}</strong>${customer?.document_number ? `<div>Documento: ${esc(customer.document_number)}</div>` : ""}${customer?.phone ? `<div>Tel: ${esc(customer.phone)}</div>` : ""}${customer?.email ? `<div>${esc(customer.email)}</div>` : ""}</article><article><h3>Orden de servicio</h3>${order ? `<strong>OS #${esc((order as any).order_number)}</strong><div>${esc(motorcycle?.brand)} ${esc(motorcycle?.model)} · ${esc(motorcycle?.plate)}</div><div>Km: ${Number((order as any).mileage || 0).toLocaleString("es-CO")}</div><div>Mecánico: ${esc(mechanic?.full_name || "No asignado")}</div>` : `<strong>Venta directa</strong>`}</article></section>
            <h3 class="section">Detalle de servicios y repuestos</h3><table><thead><tr><th>Descripción</th><th>Tipo</th><th class="r">Cant.</th><th class="r">V. unit.</th><th class="r">Total</th></tr></thead><tbody>${rowHtml}</tbody></table>
            <div class="totals"><div><div><span>Subtotal</span><b>${money(invoice.subtotal)}</b></div><div><span>Impuestos</span><b>${money(invoice.tax)}</b></div><div class="grand"><span>TOTAL</span><b>${money(invoice.total)}</b></div><div><span>Pagado</span><b>${money(invoice.paid)}</b></div><div><span>Saldo</span><b>${money(balance)}</b></div></div></div>
            <footer><div>Estado: <b>${esc(invoice.status)}</b></div><div>Gracias por confiar en MotoMil</div></footer>
          </div>`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible generar la factura.");
      }
    })();
  }, [id, supabase]);

  useEffect(() => {
    if (!html) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [html]);

  return <>{error ? <div style={{ padding: 24, color: "#a52222" }}>{error}</div> : <div dangerouslySetInnerHTML={{ __html: html }} />}</>;
}
