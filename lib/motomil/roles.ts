export const ROLES = ['owner','admin','reception','mechanic','cashier','inventory','customer'] as const;
export type Role = typeof ROLES[number];
export const ROLE_LABELS: Record<Role,string> = {
  owner:'Propietario', admin:'Administrador', reception:'Recepción', mechanic:'Mecánico', cashier:'Caja', inventory:'Inventario', customer:'Cliente'
};
