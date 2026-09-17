export type PermissionAction = "view" | "create" | "edit" | "delete";

export type PermissionModule =
  | "clientes"
  | "motocicletas"
  | "citas"
  | "ordenes"
  | "cotizaciones"
  | "inventario"
  | "facturacion"
  | "reportes"
  | "configuracion"
  | "mecanicos"
  | "finanzas"
  | "pos"
  | "mantenimiento"
  | "crm"
  | "portal";

export type Permission = `${PermissionModule}.${PermissionAction}`;

export type Role =
  | "owner"
  | "admin"
  | "mechanic"
  | "reception"
  | "cashier"
  | "inventory"
  | "customer";

export const PERMISSIONS: Record<
  PermissionModule,
  Record<PermissionAction, Permission>
> = {
  clientes: {
    view: "clientes.view",
    create: "clientes.create",
    edit: "clientes.edit",
    delete: "clientes.delete",
  },
  motocicletas: {
    view: "motocicletas.view",
    create: "motocicletas.create",
    edit: "motocicletas.edit",
    delete: "motocicletas.delete",
  },
  citas: {
    view: "citas.view",
    create: "citas.create",
    edit: "citas.edit",
    delete: "citas.delete",
  },
  ordenes: {
    view: "ordenes.view",
    create: "ordenes.create",
    edit: "ordenes.edit",
    delete: "ordenes.delete",
  },
  cotizaciones: {
    view: "cotizaciones.view",
    create: "cotizaciones.create",
    edit: "cotizaciones.edit",
    delete: "cotizaciones.delete",
  },
  inventario: {
    view: "inventario.view",
    create: "inventario.create",
    edit: "inventario.edit",
    delete: "inventario.delete",
  },
  facturacion: {
    view: "facturacion.view",
    create: "facturacion.create",
    edit: "facturacion.edit",
    delete: "facturacion.delete",
  },
  reportes: {
    view: "reportes.view",
    create: "reportes.create",
    edit: "reportes.edit",
    delete: "reportes.delete",
  },
  configuracion: {
    view: "configuracion.view",
    create: "configuracion.create",
    edit: "configuracion.edit",
    delete: "configuracion.delete",
  },
  mecanicos: {
    view: "mecanicos.view",
    create: "mecanicos.create",
    edit: "mecanicos.edit",
    delete: "mecanicos.delete",
  },
  finanzas: {
    view: "finanzas.view",
    create: "finanzas.create",
    edit: "finanzas.edit",
    delete: "finanzas.delete",
  },
  pos: {
    view: "pos.view",
    create: "pos.create",
    edit: "pos.edit",
    delete: "pos.delete",
  },
  mantenimiento: {
    view: "mantenimiento.view",
    create: "mantenimiento.create",
    edit: "mantenimiento.edit",
    delete: "mantenimiento.delete",
  },
  crm: {
    view: "crm.view",
    create: "crm.create",
    edit: "crm.edit",
    delete: "crm.delete",
  },
  portal: {
    view: "portal.view",
    create: "portal.create",
    edit: "portal.edit",
    delete: "portal.delete",
  },
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((module) =>
  Object.values(module),
);

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,

  reception: [
    PERMISSIONS.clientes.view,
    PERMISSIONS.clientes.create,
    PERMISSIONS.clientes.edit,

    PERMISSIONS.motocicletas.view,
    PERMISSIONS.motocicletas.create,
    PERMISSIONS.motocicletas.edit,

    PERMISSIONS.citas.view,
    PERMISSIONS.citas.create,
    PERMISSIONS.citas.edit,

    PERMISSIONS.ordenes.view,
    PERMISSIONS.ordenes.create,
    PERMISSIONS.ordenes.edit,

    PERMISSIONS.cotizaciones.view,
    PERMISSIONS.cotizaciones.create,
    PERMISSIONS.cotizaciones.edit,

    PERMISSIONS.facturacion.view,
    PERMISSIONS.facturacion.create,

    PERMISSIONS.reportes.view,

    PERMISSIONS.pos.view,
    PERMISSIONS.pos.create,

    PERMISSIONS.mantenimiento.view,
  ],

  mechanic: [
    PERMISSIONS.clientes.view,

    PERMISSIONS.motocicletas.view,

    PERMISSIONS.citas.view,
    PERMISSIONS.citas.edit,

    PERMISSIONS.ordenes.view,
    PERMISSIONS.ordenes.edit,

    PERMISSIONS.cotizaciones.view,
    PERMISSIONS.cotizaciones.create,

    PERMISSIONS.inventario.view,

    PERMISSIONS.mantenimiento.view,
    PERMISSIONS.mantenimiento.create,
  ],

  cashier: [
    PERMISSIONS.clientes.view,

    PERMISSIONS.motocicletas.view,

    PERMISSIONS.ordenes.view,

    PERMISSIONS.cotizaciones.view,

    PERMISSIONS.facturacion.view,
    PERMISSIONS.facturacion.create,
    PERMISSIONS.facturacion.edit,

    PERMISSIONS.finanzas.view,
    PERMISSIONS.finanzas.create,

    PERMISSIONS.pos.view,
    PERMISSIONS.pos.create,
    PERMISSIONS.pos.edit,
  ],

  inventory: [
    PERMISSIONS.clientes.view,

    PERMISSIONS.motocicletas.view,

    PERMISSIONS.ordenes.view,

    PERMISSIONS.inventario.view,
    PERMISSIONS.inventario.create,
    PERMISSIONS.inventario.edit,
    PERMISSIONS.inventario.delete,
  ],

  customer: [
    PERMISSIONS.clientes.view,
    PERMISSIONS.motocicletas.view,
    PERMISSIONS.citas.view,
    PERMISSIONS.citas.create,
    PERMISSIONS.ordenes.view,
    PERMISSIONS.cotizaciones.view,
    PERMISSIONS.facturacion.view,
    PERMISSIONS.mantenimiento.view,
    PERMISSIONS.portal.view,
  ],
};

export function can(
  permissions: string[] | null | undefined,
  permission: string,
): boolean {
  if (!permissions) return false;

  return permissions.includes(permission);
}

export function getRolePermissions(role: string | null | undefined): Permission[] {
  if (!role) return [];

  if (role in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[role as Role];
  }

  return [];
}

export function canRole(
  role: string | null | undefined,
  permission: Permission | string,
): boolean {
  return can(getRolePermissions(role), permission);
}