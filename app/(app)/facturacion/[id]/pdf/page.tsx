"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createWorkshopLogoSignedUrl } from "@/lib/tallerpro/workshop-storage";

export default function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [id, setId] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    params.then((value) => {
      if (mounted) setId(value.id);
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function loadInvoice() {
      try {
        setError("");

        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .single();

        if (invoiceError) throw invoiceError;
        if (!invoice) throw new Error("Factura no encontrada.");

        const [
          { data: customer },
          { data: order },
          { data: organization },
        ] = await Promise.all([
          invoice.customer_id
            ? supabase
                .from("customers")
                .select(
                  "full_name,document_number,phone,whatsapp,email,address"
                )
                .eq("id", invoice.customer_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          invoice.service_order_id
            ? supabase
                .from("service_orders")
                .select(
                  "order_number,status,received_at,mileage,diagnosis,observations,organization_id,motorcycle:motorcycles(plate,brand,model,year,current_km),mechanic:mechanics(full_name,specialty)"
                )
                .eq("id", invoice.service_order_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("organizations")
            .select(
              "name,legal_name,tax_id,nit,phone,email,address,city,country,currency,logo_url"
            )
            .eq("id", invoice.organization_id)
            .maybeSingle(),
        ]);

        if (!organization) {
          throw new Error(
            "No fue posible obtener los datos del taller para generar la factura."
          );
        }

        const { data: itemsData, error: itemsError } = invoice.service_order_id
          ? await supabase
              .from("service_order_items")
              .select("description,item_type,quantity,unit_price,created_at")
              .eq("service_order_id", invoice.service_order_id)
              .order("created_at", { ascending: true })
          : { data: [], error: null };

        if (itemsError) throw itemsError;

        let logoUrl: string | null = null;

        if (organization.logo_url) {
          try {
            logoUrl = await createWorkshopLogoSignedUrl(
              supabase,
              organization.logo_url
            );
          } catch {
            logoUrl = null;
          }
        }

        const esc = (value: unknown) =>
          String(value ?? "").replace(/[&<>\"]/g, (char) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
            })[char] ?? char
          );

        const money = (value: unknown) =>
          Number(value || 0).toLocaleString("es-CO", {
            style: "currency",
            currency: organization.currency || "COP",
            maximumFractionDigits: 0,
          });

        const date = (value: string | null) =>
          value
            ? new Date(value).toLocaleDateString("es-CO")
            : "-";

        const items = (itemsData ?? []) as Array<{
          description: string | null;
          item_type: string | null;
          quantity: number;
          unit_price: number;
        }>;

        const rowHtml = (items.length
          ? items
          : [
              {
                description: "Servicios y conceptos de la factura",
                item_type: "other",
                quantity: 1,
                unit_price: Number(invoice.subtotal || 0),
              },
            ]
        )
          .map((item) => {
            const total =
              Number(item.quantity || 0) * Number(item.unit_price || 0);

            const typeLabel =
              item.item_type === "part"
                ? "Repuesto"
                : item.item_type === "service"
                  ? "Servicio"
                  : "Otro";

            return `
              <tr>
                <td>${esc(item.description)}</td>
                <td>${esc(typeLabel)}</td>
                <td class="r">${esc(item.quantity)}</td>
                <td class="r">${money(item.unit_price)}</td>
                <td class="r">${money(total)}</td>
              </tr>
            `;
          })
          .join("");

        const balance = Math.max(
          0,
          Number(invoice.total || 0) - Number(invoice.paid || 0)
        );

        const motorcycle = Array.isArray((order as any)?.motorcycle)
          ? (order as any).motorcycle[0]
          : (order as any)?.motorcycle;

        const mechanic = Array.isArray((order as any)?.mechanic)
          ? (order as any).mechanic[0]
          : (order as any)?.mechanic;

        const organizationName =
          organization.name ||
          organization.legal_name ||
          "Taller de motocicletas";

        const logoMarkup = logoUrl
          ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo del taller" />`
          : `<div class="logo-fallback">${esc(
              organizationName.slice(0, 2).toUpperCase()
            )}</div>`;

        const watermarkMarkup = logoUrl
          ? `<img class="watermark" src="${esc(logoUrl)}" alt="" />`
          : "";

        const legalName =
          organization.legal_name &&
          organization.legal_name !== organization.name
            ? organization.legal_name
            : "";

        const nit = organization.tax_id || organization.nit || "";

        const location = [
          organization.address,
          organization.city,
          organization.country === "CO" ? "Colombia" : organization.country,
        ]
          .filter(Boolean)
          .join(" · ");

        if (!mounted) return;

        setHtml(`
          <div class="sheet">
            ${watermarkMarkup}

            <header>
              ${logoMarkup}
              <div class="org">
                <h2>${esc(organizationName)}</h2>
                ${legalName ? `<div>${esc(legalName)}</div>` : ""}
                ${nit ? `<div>NIT: ${esc(nit)}</div>` : ""}
                ${location ? `<div>${esc(location)}</div>` : ""}
                ${organization.phone ? `<div>Tel: ${esc(organization.phone)}</div>` : ""}
                ${organization.email ? `<div>${esc(organization.email)}</div>` : ""}
              </div>
            </header>

            <div class="title">
              <div>
                <h1>FACTURA DE VENTA</h1>
                <div>Fecha de emisión: ${esc(date(invoice.issued_at))}</div>
              </div>
              <div class="number">${esc(invoice.invoice_number)}</div>
            </div>

            <section class="grid">
              <article>
                <h3>Cliente</h3>
                <strong>${esc(customer?.full_name || "Cliente no registrado")}</strong>
                ${customer?.document_number ? `<div>Documento: ${esc(customer.document_number)}</div>` : ""}
                ${customer?.phone ? `<div>Tel: ${esc(customer.phone)}</div>` : ""}
                ${customer?.email ? `<div>${esc(customer.email)}</div>` : ""}
                ${customer?.address ? `<div>${esc(customer.address)}</div>` : ""}
              </article>

              <article>
                <h3>Orden de servicio</h3>
                ${order
                  ? `
                    <strong>OS #${esc((order as any).order_number)}</strong>
                    <div>${esc(motorcycle?.brand)} ${esc(motorcycle?.model)} · ${esc(motorcycle?.plate)}</div>
                    <div>Km: ${Number((order as any).mileage || 0).toLocaleString("es-CO")}</div>
                    <div>Mecánico: ${esc(mechanic?.full_name || "No asignado")}</div>
                  `
                  : `<strong>Venta directa</strong>`}
              </article>
            </section>

            ${
              (order as any)?.diagnosis || (order as any)?.observations
                ? `
                  <section class="grid secondary-grid">
                    <article>
                      <h3>Diagnóstico</h3>
                      <div>${esc((order as any)?.diagnosis || "-")}</div>
                    </article>
                    <article>
                      <h3>Observaciones</h3>
                      <div>${esc((order as any)?.observations || "-")}</div>
                    </article>
                  </section>
                `
                : ""
            }

            <h3 class="section">Detalle de servicios y repuestos</h3>

            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th class="r">Cant.</th>
                  <th class="r">V. unit.</th>
                  <th class="r">Total</th>
                </tr>
              </thead>
              <tbody>${rowHtml}</tbody>
            </table>

            <div class="totals">
              <div>
                <div><span>Subtotal</span><b>${money(invoice.subtotal)}</b></div>
                <div><span>Impuestos</span><b>${money(invoice.tax)}</b></div>
                <div class="grand"><span>TOTAL</span><b>${money(invoice.total)}</b></div>
                <div><span>Pagado</span><b>${money(invoice.paid)}</b></div>
                <div><span>Saldo</span><b>${money(balance)}</b></div>
              </div>
            </div>

            <footer>
              <div>
                <div>Estado: <b>${esc(invoice.status)}</b></div>
                <div>${esc(organizationName)}</div>
              </div>
              <div>
                <div>${esc(invoice.invoice_number)}</div>
                <div class="small">Documento generado mediante ${esc("TallerPro")}</div>
              </div>
            </footer>
          </div>
        `);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible generar la factura."
        );
      }
    }

    void loadInvoice();

    return () => {
      mounted = false;
    };
  }, [id, supabase]);

  useEffect(() => {
    if (!html) return;

    const timer = window.setTimeout(async () => {
      const images = Array.from(document.images);

      await Promise.all(
        images.map(
          (image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.addEventListener("load", () => resolve(), {
                    once: true,
                  });
                  image.addEventListener("error", () => resolve(), {
                    once: true,
                  });
                })
        )
      );

      window.print();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [html]);

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: "Arial, sans-serif",
          color: "#a52222",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <>
      {!html ? (
        <div
          style={{
            padding: 24,
            fontFamily: "Arial, sans-serif",
          }}
        >
          Generando factura...
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </>
  );
}
