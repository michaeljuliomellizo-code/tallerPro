export const demoMetrics = {
  today: { received: 8, repair: 12, ready: 5, appointments: 7, billed: 1850000 },
  month: { orders: 156, income: 28500000, costs: 18200000, profit: 10300000 },
};

export const demoCustomers = [
  { id: "c1", name: "Carlos Pérez", phone: "300 555 1020", email: "carlos@example.com", motorcycles: 2, lastVisit: "10/08/2026" },
  { id: "c2", name: "Laura Gómez", phone: "301 440 2099", email: "laura@example.com", motorcycles: 1, lastVisit: "08/08/2026" },
  { id: "c3", name: "Andrés Rodríguez", phone: "315 210 8821", email: "andres@example.com", motorcycles: 3, lastVisit: "06/08/2026" },
  { id: "c4", name: "Valentina Torres", phone: "310 771 3344", email: "valentina@example.com", motorcycles: 1, lastVisit: "04/08/2026" },
];

export const demoMotorcycles = [
  { id: "m1", plate: "ABC123", brand: "Yamaha", model: "FZ 2.0", year: 2022, km: 45280, owner: "Carlos Pérez", nextKm: 50000, status: "En reparación" },
  { id: "m2", plate: "KLM456", brand: "Honda", model: "CB 190R", year: 2023, km: 28400, owner: "Laura Gómez", nextKm: 30000, status: "Lista" },
  { id: "m3", plate: "RTY789", brand: "Suzuki", model: "Gixxer 150", year: 2021, km: 51100, owner: "Andrés Rodríguez", nextKm: 52000, status: "Diagnóstico" },
  { id: "m4", plate: "MOT321", brand: "AKT", model: "NKD 125", year: 2024, km: 9200, owner: "Valentina Torres", nextKm: 10000, status: "Recibida" },
];

export const demoOrders = [
  { id: "1052", plate: "ABC123", customer: "Carlos Pérez", mechanic: "Julián", status: "En reparación", total: 650000, progress: 70, date: "22/08/2026" },
  { id: "1051", plate: "KLM456", customer: "Laura Gómez", mechanic: "Mateo", status: "Lista", total: 230000, progress: 95, date: "22/08/2026" },
  { id: "1050", plate: "RTY789", customer: "Andrés Rodríguez", mechanic: "Julián", status: "Diagnóstico", total: 0, progress: 30, date: "21/08/2026" },
  { id: "1049", plate: "MOT321", customer: "Valentina Torres", mechanic: "Carlos", status: "Cotización", total: 480000, progress: 45, date: "21/08/2026" },
];

export const demoInventory = [
  { id: "p1", sku: "FIL-YAM-01", name: "Filtro aceite Yamaha", category: "Filtros", stock: 7, min: 10, cost: 18000, price: 25000 },
  { id: "p2", sku: "ACE-10W40", name: "Aceite 10W40 1L", category: "Lubricantes", stock: 24, min: 12, cost: 26000, price: 38000 },
  { id: "p3", sku: "BUJ-NGK-CR8", name: "Bujía NGK CR8E", category: "Encendido", stock: 4, min: 8, cost: 22000, price: 32000 },
  { id: "p4", sku: "PAS-FR-01", name: "Pastillas freno delantero", category: "Frenos", stock: 15, min: 5, cost: 45000, price: 70000 },
];

export const demoAppointments = [
  { time: "08:00", customer: "Carlos Pérez", plate: "ABC123", service: "Mantenimiento", status: "Confirmada" },
  { time: "09:30", customer: "Laura Gómez", plate: "KLM456", service: "Frenos", status: "En espera" },
  { time: "11:00", customer: "Andrés Rodríguez", plate: "RTY789", service: "Diagnóstico", status: "Confirmada" },
  { time: "14:00", customer: "Valentina Torres", plate: "MOT321", service: "Revisión", status: "Pendiente" },
];
