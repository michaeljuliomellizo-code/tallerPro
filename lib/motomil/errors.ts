export function messageOf(error:unknown, fallback='No fue posible completar la operación.'){ return error instanceof Error ? error.message : fallback; }
