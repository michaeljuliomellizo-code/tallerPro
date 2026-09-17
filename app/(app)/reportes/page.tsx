import ReportsDashboard from '@/components/reports-dashboard';
import SalesReport from '@/components/sales-report';
import ServiceReport from '@/components/service-report';
import InventoryReport from '@/components/inventory-report';
import CustomerReport from '@/components/customer-report';
import MechanicPerformanceReport from '@/components/mechanic-performance-report';
import FinancialReport from '@/components/financial-report';
import CashReport from '@/components/cash-report';

export default function ReportsPage(){return <><div className="section-head"><div><div className="eyebrow">Indicadores</div><h1 className="page-title">Reportes</h1><p className="page-subtitle">Indicadores operativos, comerciales y financieros.</p></div></div><ReportsDashboard/><div className="grid grid-2" style={{marginTop:16}}><SalesReport/><ServiceReport/></div><div className="grid grid-2" style={{marginTop:16}}><InventoryReport/><CustomerReport/></div><div className="grid grid-2" style={{marginTop:16}}><MechanicPerformanceReport/><FinancialReport/></div><div style={{marginTop:16}}><CashReport/></div></>}
