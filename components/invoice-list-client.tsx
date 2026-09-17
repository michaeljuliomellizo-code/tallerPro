"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/motomil/formatters";

type Invoice = {
  id: string;
  invoice_number: string;
  total: number;
  paid: number;
  status: string;
  issued_at: string;
};

export default function InvoiceListClient() {
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadInvoices = async () => {
      const organizationId = await getCurrentOrganizationId();

      if (!organizationId) {
        setInvoices([]);
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, total, paid, status, issued_at"
        )
        .eq("organization_id", organizationId)
        .order("issued_at", { ascending: false });

      if (error) {
        console.error("Error cargando facturas:", error);
        setInvoices([]);
        return;
      }

      setInvoices(data ?? []);
    };

    loadInvoices();
  }, [supabase]);

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <div className="eyebrow">Facturación</div>
          <h1 className="page-title">Facturas</h1>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>

                <td>
                  {new Date(invoice.issued_at).toLocaleString("es-CO")}
                </td>

                <td>{money(invoice.total)}</td>

                <td>{money(invoice.paid)}</td>

                <td>{invoice.status}</td>

                <td>
                  <Link
                    className="btn btn-ghost"
                    href={`/facturacion/${invoice.id}`}
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}