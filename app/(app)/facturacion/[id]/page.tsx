import InvoiceDetailClient from "@/components/invoice-detail-client";
export default async function InvoicePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <InvoiceDetailClient invoiceId={id}/>;}
