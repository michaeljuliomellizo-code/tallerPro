"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createWorkshopLogoSignedUrl } from "@/lib/tallerpro/workshop-storage";

const STATUS_LABELS: Record<string, string> = {
  received: "Recibida",
  diagnosis: "Diagnóstico",
  quote: "Cotización",
  approved: "Aprobada",
  repair: "Reparación",
  quality: "Calidad",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

export default function ServiceOrderPrintPage({
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

    async function loadOrder() {
      try {
        setError("");

        const { data: order, error: orderError } = await supabase
          .from("service_orders")
          .select(
            `
              id,
              organization_id,
              order_number,
              status,
              mileage,
              reported_problem,
              diagnosis,
              observations,
              received_at,
              estimated_delivery_at,
              delivered_at,
              subtotal,
              tax,
              total,
              customer:customers(
                full_name,
                document_number,
                phone,
                whatsapp,
                email,
                address
              ),
              motorcycle:motorcycles(
                plate,
                brand,
                model,
                year,
                color,
                current_km
              ),
              mechanic:mechanics(
                full_name,
                specialty
              )
            `,
          )
          .eq("id", id)
          .single();

        if (orderError) throw orderError;
        if (!order) throw new Error("Orden de servicio no encontrada.");

        const [
          { data: itemsData, error: itemsError },
          { data: organization, error: organizationError },
        ] = await Promise.all([
          supabase
            .from("service_order_items")
            .select(
              "description,item_type,quantity,unit_price,created_at",
            )
            .eq("service_order_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("organizations")
            .select(
              "name,legal_name,tax_id,nit,phone,email,address,city,country,currency,logo_url",
            )
            .eq("id", order.organization_id)
            .single(),
        ]);

        if (itemsError) throw itemsError;
        if (organizationError) throw organizationError;
        if (!organization) {
          throw new Error("No fue posible obtener los datos del taller.");
        }

        let logoUrl: string | null = null;

        if (organization.logo_url) {
          try {
            logoUrl = await createWorkshopLogoSignedUrl(
              supabase,
              organization.logo_url,
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
            })[char] ?? char,
          );

        const money = (value: unknown) =>
          Number(value || 0).toLocaleString("es-CO", {
            style: "currency",
            currency: organization.currency || "COP",
            maximumFractionDigits: 0,
          });

        const date = (value: string | null) =>
          value ? new Date(value).toLocaleDateString("es-CO") : "-";

        const dateTime = (value: string | null) =>
          value
            ? new Date(value).toLocaleString("es-CO", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "-";

        const one = <T,>(value: T | T[] | null | undefined): T | null => {
          if (!value) return null;
          return Array.isArray(value) ? value[0] ?? null : value;
        };

        const customer = one(order.customer as any);
        const motorcycle = one(order.motorcycle as any);
        const mechanic = one(order.mechanic as any);
        const items = (itemsData ?? []) as Array<{
          description: string | null;
          item_type: string | null;
          quantity: number;
          unit_price: number;
        }>;

        const typeLabel = (type: string | null) => {
          if (type === "part") return "Repuesto";
          if (type === "service") return "Servicio";
          if (type === "labor") return "Mano de obra";
          return "Otro";
        };

        const rowHtml = items.length
          ? items
              .map((item) => {
                const total =
                  Number(item.quantity || 0) * Number(item.unit_price || 0);

                return `
                  <tr>
                    <td>${esc(item.description || "Concepto sin descripción")}</td>
                    <td>${esc(typeLabel(item.item_type))}</td>
                    <td class="r">${esc(item.quantity)}</td>
                    <td class="r">${money(item.unit_price)}</td>
                    <td class="r">${money(total)}</td>
                  </tr>
                `;
              })
              .join("")
          : `
              <tr>
                <td colspan="5">No hay conceptos registrados en la orden.</td>
              </tr>
            `;

        const organizationName =
          organization.name ||
          organization.legal_name ||
          "Taller de motocicletas";

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

        const logoMarkup = logoUrl
          ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo del taller" />`
          : `<div class="logo-fallback">${esc(
              organizationName.slice(0, 2).toUpperCase(),
            )}</div>`;

        const watermarkMarkup = logoUrl
          ? `<img class="watermark" src="${esc(logoUrl)}" alt="" />`
          : "";

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
                <h1>ORDEN DE SERVICIO</h1>
                <div class="title-meta">
                  Recepción: ${esc(dateTime(order.received_at))}<br />
                  Entrega estimada: ${esc(dateTime(order.estimated_delivery_at))}
                </div>
                <span class="status">${esc(STATUS_LABELS[order.status] || order.status)}</span>
              </div>
              <div class="number">OS #${esc(order.order_number)}</div>
            </div>

            <section class="grid">
              <article>
                <h3>Cliente</h3>
                <strong>${esc(customer?.full_name || "Cliente no registrado")}</strong>
                ${customer?.document_number ? `<div>Documento: ${esc(customer.document_number)}</div>` : ""}
                ${customer?.phone ? `<div>Tel: ${esc(customer.phone)}</div>` : ""}
                ${customer?.whatsapp ? `<div>WhatsApp: ${esc(customer.whatsapp)}</div>` : ""}
                ${customer?.email ? `<div>${esc(customer.email)}</div>` : ""}
                ${customer?.address ? `<div>${esc(customer.address)}</div>` : ""}
              </article>

              <article>
                <h3>Motocicleta</h3>
                <strong>${esc(motorcycle?.brand || "")} ${esc(motorcycle?.model || "")}</strong>
                <div>Placa: <b>${esc(motorcycle?.plate || "Sin placa")}</b></div>
                ${motorcycle?.year ? `<div>Año: ${esc(motorcycle.year)}</div>` : ""}
                ${motorcycle?.color ? `<div>Color: ${esc(motorcycle.color)}</div>` : ""}
                <div>Kilometraje: ${Number(order.mileage || motorcycle?.current_km || 0).toLocaleString("es-CO")} km</div>
                <div>Mecánico: ${esc(mechanic?.full_name || "No asignado")}</div>
              </article>
            </section>

            <h3 class="section">Información técnica</h3>
            <section class="grid">
              <article>
                <h3>Problema reportado</h3>
                <div class="text-block">${esc(order.reported_problem || "-")}</div>
              </article>
              <article>
                <h3>Diagnóstico</h3>
                <div class="text-block">${esc(order.diagnosis || "-")}</div>
              </article>
              <article>
                <h3>Observaciones</h3>
                <div class="text-block">${esc(order.observations || "-")}</div>
              </article>
              <article>
                <h3>Fechas</h3>
                <div>Recepción: ${esc(dateTime(order.received_at))}</div>
                <div>Entrega estimada: ${esc(dateTime(order.estimated_delivery_at))}</div>
                <div>Entrega real: ${esc(dateTime(order.delivered_at))}</div>
              </article>
            </section>

            <h3 class="section">Servicios y repuestos</h3>
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
                <div><span>Subtotal</span><b>${money(order.subtotal)}</b></div>
                <div><span>Impuestos</span><b>${money(order.tax)}</b></div>
                <div class="grand"><span>TOTAL</span><b>${money(order.total)}</b></div>
              </div>
            </div>

            <div class="signatures">
              <div class="signature">
                Firma / conformidad del cliente<br />
                ${esc(customer?.full_name || "Cliente")}
              </div>
              <div class="signature">
                Firma responsable del taller<br />
                ${esc(mechanic?.full_name || organizationName)}
              </div>
            </div>

            <footer>
              <div>
                <div>Orden de servicio #${esc(order.order_number)}</div>
                <div>${esc(organizationName)}</div>
              </div>
              <div>
                <div>Fecha de impresión: ${esc(date(new Date().toISOString()))}</div>
                <div class="small">Documento generado mediante TallerPro</div>
              </div>
            </footer>
          </div>
        `);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible generar la orden de servicio.",
        );
      }
    }

    void loadOrder();

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
                }),
        ),
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

  return !html ? (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      Generando orden de servicio...
    </div>
  ) : (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
