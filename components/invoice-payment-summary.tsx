import { money } from "@/lib/utils";

export default function InvoicePaymentSummary({
  total,
  paid,
}: {
  total: number;
  paid: number;
}) {
  const balance = Math.max(0,total-paid);
  return (
    <div className="grid grid-3">
      <div className="card">
        <div className="muted">Total factura</div>
        <strong style={{fontSize:24}}>{money(total)}</strong>
      </div>
      <div className="card">
        <div className="muted">Total pagado</div>
        <strong style={{fontSize:24,color:"#0c6b58"}}>{money(paid)}</strong>
      </div>
      <div className="card">
        <div className="muted">Saldo pendiente</div>
        <strong style={{fontSize:24,color:balance ? "#a52222" : "#0c6b58"}}>
          {money(balance)}
        </strong>
      </div>
    </div>
  );
}
