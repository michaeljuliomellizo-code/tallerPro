export function money(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}
export function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }
