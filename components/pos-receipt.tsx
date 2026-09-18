"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { createWorkshopLogoSignedUrl } from "@/lib/tallerpro/workshop-storage";

type Props = {
  sale: any;
  items: any[];
};

export default function PosReceipt({ sale, items }: Props) {
  const supabase = createClient();
  const [workshopName, setWorkshopName] = useState("Taller");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [taxId, setTaxId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const organizationId = await getCurrentOrganizationId();
        const { data, error } = await supabase
          .from("organizations")
          .select("name,logo_url,phone,tax_id,nit")
          .eq("id", organizationId)
          .single();

        if (error) throw error;
        if (!active || !data) return;

        setWorkshopName(data.name || "Taller");
        setPhone(data.phone ?? null);
        setTaxId(data.tax_id ?? data.nit ?? null);

        if (data.logo_url) {
          setLogoUrl(await createWorkshopLogoSignedUrl(supabase, data.logo_url));
        }
      } catch (error) {
        console.error("No fue posible cargar el branding del comprobante POS:", error);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="card" id="pos-receipt">
      <div style={{ textAlign: "center" }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={workshopName}
            style={{ maxWidth: 120, maxHeight: 70, objectFit: "contain", margin: "0 auto 8px" }}
          />
        ) : null}
        <strong>{workshopName}</strong>
        {taxId ? <div className="muted">NIT {taxId}</div> : null}
        {phone ? <div className="muted">Tel. {phone}</div> : null}
        <div className="muted">Comprobante POS-{String(sale.sale_number).padStart(6, "0")}</div>
      </div>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.description} × {item.quantity}</td>
                <td style={{ textAlign: "right" }}>
                  {Number(item.total).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, marginTop: 12 }}>
        <strong>Total</strong>
        <strong>
          {Number(sale.total).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          })}
        </strong>
      </div>

      <div className="muted" style={{ textAlign: "center", marginTop: 12, fontSize: 10 }}>
        Gracias por su visita.
      </div>
    </div>
  );
}
