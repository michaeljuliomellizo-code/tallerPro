"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

export default function ServiceOrderPrintButton({
  orderId,
}: {
  orderId: string;
}) {
  return (
    <Link
      href={`/ordenes/${orderId}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-ghost"
      title="Imprimir orden de servicio"
    >
      <Printer size={14} />
      Imprimir orden
    </Link>
  );
}
