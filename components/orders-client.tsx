"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardPlus,
  Eye,
  Plus,
  Search,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Status, Timeline } from "@/components/module-page";
import { money } from "@/lib/utils";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
};

type Motorcycle = {
  id: string;
  customer_id: string;
  plate: string;
  brand: string;
  model: string;
  current_km: number;
  active: boolean;
};

type Mechanic = {
  id: string;
  full_name: string;
  phone: string | null;
  specialty: string | null;
  active: boolean;
};

type ServiceOrder = {
  id: string;
  organization_id: string;
  order_number: number;
  customer_id: string;
  motorcycle_id: string;
  mechanic_id: string | null;
  status: OrderStatus;
  mileage: number;
  reported_problem: string | null;
  diagnosis: string | null;
  observations: string | null;
  received_at: string;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
  customer?: Customer | Customer[] | null;
  motorcycle?: Motorcycle | Motorcycle[] | null;
  mechanic?: Mechanic | Mechanic[] | null;
};

type OrderStatus =
  | "received"
  | "diagnosis"
  | "quote"
  | "approved"
  | "repair"
  | "quality"
  | "ready"
  | "delivered"
  | "cancelled";

type FormState = {
  customer_id: string;
  motorcycle_id: string;
  mechanic_id: string;
  mileage: string;
  reported_problem: string;
  observations: string;
  estimated_delivery_at: string;
};

const emptyForm: FormState = {
  customer_id: "",
  motorcycle_id: "",
  mechanic_id: "",
  mileage: "0",
  reported_problem: "",
  observations: "",
  estimated_delivery_at: "",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibida",
  diagnosis: "Diagnóstico",
  quote: "Cotización",
  approved: "Aprobada",
  repair: "Reparación",
  quality: "Calidad",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

const STATUS_TONES: Record<
  OrderStatus,
  "green" | "blue" | "yellow" | "gray" | "red"
> = {
  received: "yellow",
  diagnosis: "yellow",
  quote: "yellow",
  approved: "blue",
  repair: "blue",
  quality: "blue",
  ready: "green",
  delivered: "green",
  cancelled: "red",
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dateLabel(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateTimeLocalLabel(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OrdersClient() {
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    OrderStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function getOrganizationId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("No existe una sesión activa.");
    }

    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data?.organization_id) {
      throw new Error(
        "El usuario autenticado no tiene una organización asignada."
      );
    }

    return data.organization_id;
  }

  async function loadOrders() {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        organization_id,
        order_number,
        customer_id,
        motorcycle_id,
        mechanic_id,
        status,
        mileage,
        reported_problem,
        diagnosis,
        observations,
        received_at,
        estimated_delivery_at,
        delivered_at,
        subtotal,
        tax,
        total,
        created_at,
        updated_at,
        customer:customers (
          id,
          full_name,
          phone
        ),
        motorcycle:motorcycles (
          id,
          customer_id,
          plate,
          brand,
          model,
          current_km,
          active
        ),
        mechanic:mechanics (
          id,
          full_name,
          phone,
          specialty,
          active
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    setOrders((data ?? []) as ServiceOrder[]);
  }

  async function loadCatalogs() {
    const organizationId = await getOrganizationId();

    const [customersResult, motorcyclesResult, mechanicsResult] =
      await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, phone")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("full_name"),

        supabase
          .from("motorcycles")
          .select(
            "id, customer_id, plate, brand, model, current_km, active"
          )
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("plate"),

        supabase
          .from("mechanics")
          .select(
            "id, full_name, phone, specialty, active"
          )
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("full_name"),
      ]);

    if (customersResult.error) throw customersResult.error;
    if (motorcyclesResult.error) throw motorcyclesResult.error;
    if (mechanicsResult.error) throw mechanicsResult.error;

    setCustomers(customersResult.data ?? []);
    setMotorcycles(motorcyclesResult.data ?? []);
    setMechanics(mechanicsResult.data ?? []);
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadOrders(),
        loadCatalogs(),
      ]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las órdenes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredMotorcycles = useMemo(() => {
    if (!form.customer_id) return [];

    return motorcycles.filter(
      (motorcycle) =>
        motorcycle.customer_id === form.customer_id
    );
  }, [motorcycles, form.customer_id]);

  useEffect(() => {
    if (
      form.motorcycle_id &&
      !filteredMotorcycles.some(
        (motorcycle) =>
          motorcycle.id === form.motorcycle_id
      )
    ) {
      setForm((current) => ({
        ...current,
        motorcycle_id: "",
      }));
    }
  }, [form.customer_id, filteredMotorcycles]);

  const filteredOrders = useMemo(() => {
    const text = query.trim().toLowerCase();

    return orders.filter((order) => {
      const customer = one(order.customer);
      const motorcycle = one(order.motorcycle);
      const mechanic = one(order.mechanic);

      const matchesText =
        !text ||
        [
          order.order_number,
          customer?.full_name ?? "",
          motorcycle?.plate ?? "",
          motorcycle?.brand ?? "",
          motorcycle?.model ?? "",
          mechanic?.full_name ?? "",
          order.reported_problem ?? "",
          order.diagnosis ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  const kanban = {
    received: filteredOrders.filter(
      (order) => order.status === "received"
    ),
    diagnosis: filteredOrders.filter((order) =>
      ["diagnosis", "quote"].includes(order.status)
    ),
    repair: filteredOrders.filter(
      (order) => order.status === "repair"
    ),
    ready: filteredOrders.filter(
      (order) => order.status === "ready"
    ),
  };

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setMessage("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setError("");
    setForm(emptyForm);
  }

  function updateField(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCustomerChange(customerId: string) {
    const selectedMotorcycle = motorcycles.find(
      (motorcycle) =>
        motorcycle.customer_id === customerId
    );

    setForm((current) => ({
      ...current,
      customer_id: customerId,
      motorcycle_id:
        selectedMotorcycle?.id ?? "",
      mileage:
        selectedMotorcycle?.current_km?.toString() ??
        "0",
    }));
  }

  async function saveOrder(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const organizationId = await getOrganizationId();

      if (!form.customer_id) {
        throw new Error("Selecciona un cliente.");
      }

      if (!form.motorcycle_id) {
        throw new Error(
          "Selecciona una motocicleta del cliente."
        );
      }

      if (!form.mileage) {
        throw new Error(
          "El kilometraje de recepción es obligatorio."
        );
      }

      const motorcycle = motorcycles.find(
        (item) => item.id === form.motorcycle_id
      );

      if (!motorcycle) {
        throw new Error(
          "La motocicleta seleccionada no existe."
        );
      }

      if (
        motorcycle.customer_id !== form.customer_id
      ) {
        throw new Error(
          "La motocicleta no pertenece al cliente seleccionado."
        );
      }

      const estimatedDeliveryAt =
        form.estimated_delivery_at
            ? new Date(form.estimated_delivery_at)
            : null;

        if (
        estimatedDeliveryAt &&
        Number.isNaN(estimatedDeliveryAt.getTime())
        ) {
        throw new Error(
            "La fecha de entrega estimada no es válida."
        );
        }

        const payload = {
        organization_id: organizationId,
        customer_id: form.customer_id,
        motorcycle_id: form.motorcycle_id,
        mechanic_id: form.mechanic_id || null,
        status: "received" as OrderStatus,
        mileage: Number(form.mileage),
        reported_problem:
            form.reported_problem.trim() || null,
        diagnosis: null,
        observations:
            form.observations.trim() || null,
        estimated_delivery_at:
            estimatedDeliveryAt
            ? estimatedDeliveryAt.toISOString()
            : null,
        };

      const { error } = await supabase
        .from("service_orders")
        .insert(payload);

      if (error) throw error;

      setMessage(
        "Orden de servicio creada correctamente."
      );

      setOpen(false);
      setForm(emptyForm);

      await loadOrders();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible crear la orden."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            Centro operativo
          </div>

          <h1 className="page-title">
            Órdenes de servicio
          </h1>

          <p className="page-subtitle">
            Una orden conecta recepción → diagnóstico
            → cotización → reparación → calidad → entrega.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreate}
        >
          <Plus size={15} />
          Nueva orden
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#e9f8f2",
            color: "#146c50",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      {error && !open && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fff0f0",
            color: "#a52222",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div
        className="card"
        style={{ marginBottom: 16 }}
      >
        <Timeline current={4} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#808987",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {[
            "Recibida",
            "Diagnóstico",
            "Cotización",
            "Aprobada",
            "Reparación",
            "Calidad",
            "Lista",
            "Entregada",
          ].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={15} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Buscar orden, placa, cliente o mecánico..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as
                | OrderStatus
                | "all"
            )
          }
        >
          <option value="all">
            Todos los estados
          </option>

          {(
            Object.keys(
              STATUS_LABELS
            ) as OrderStatus[]
          ).map((status) => (
            <option
              key={status}
              value={status}
            >
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card">
          <div
            style={{
              padding: 30,
              textAlign: "center",
            }}
          >
            Cargando órdenes...
          </div>
        </div>
      ) : (
        <>
          <div className="status-board">
            <Column
              title="Recibida"
              items={kanban.received}
            />

            <Column
              title="Diagnóstico / Cotización"
              items={kanban.diagnosis}
            />

            <Column
              title="En reparación"
              items={kanban.repair}
            />

            <Column
              title="Lista"
              items={kanban.ready}
            />
          </div>

          <div style={{ height: 18 }} />

          <div className="card">
            <div className="section-head">
              <h2>Todas las órdenes</h2>

              <button className="btn btn-ghost">
                <ClipboardPlus size={14} />
                Exportar
              </button>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Moto</th>
                    <th>Mecánico</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 30,
                          textAlign: "center",
                          color: "#7c8583",
                        }}
                      >
                        No hay órdenes para mostrar.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const customer = one(
                        order.customer
                      );
                      const motorcycle = one(
                        order.motorcycle
                      );
                      const mechanic = one(
                        order.mechanic
                      );

                      return (
                        <tr key={order.id}>
                          <td>
                            <strong>
                              #{order.order_number}
                            </strong>
                          </td>

                          <td>
                            {dateLabel(
                              order.received_at
                            )}
                          </td>

                          <td>
                            {customer?.full_name ??
                              "—"}
                          </td>

                          <td>
                            {motorcycle
                              ? `${motorcycle.plate} · ${motorcycle.brand}`
                              : "—"}
                          </td>

                          <td>
                            {mechanic?.full_name ??
                              "Sin asignar"}
                          </td>

                          <td>
                            <Status
                              tone={
                                STATUS_TONES[
                                  order.status
                                ]
                              }
                            >
                              {
                                STATUS_LABELS[
                                  order.status
                                ]
                              }
                            </Status>
                          </td>

                          <td>
                            {money(
                              Number(order.total ?? 0)
                            )}
                          </td>

                          <td>
                            <Link
                              href={`/ordenes/${order.id}`}
                              className="btn btn-ghost"
                            >
                              <Eye size={13} />
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {open && (
        <div style={modalBackdrop}>
          <form
            className="card"
            style={modal}
            onSubmit={saveOrder}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Operación
                </div>

                <h2>Nueva orden de servicio</h2>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={15} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Cliente *</label>

                <select
                  required
                  value={form.customer_id}
                  onChange={(e) =>
                    handleCustomerChange(
                      e.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    Seleccionar cliente...
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Motocicleta *</label>

                <select
                  required
                  value={form.motorcycle_id}
                  onChange={(e) =>
                    updateField(
                      "motorcycle_id",
                      e.target.value
                    )
                  }
                  disabled={
                    saving ||
                    !form.customer_id
                  }
                >
                  <option value="">
                    {!form.customer_id
                      ? "Primero selecciona cliente..."
                      : filteredMotorcycles.length ===
                        0
                      ? "El cliente no tiene motos activas"
                      : "Seleccionar motocicleta..."}
                  </option>

                  {filteredMotorcycles.map(
                    (motorcycle) => (
                      <option
                        key={motorcycle.id}
                        value={motorcycle.id}
                      >
                        {motorcycle.plate} ·{" "}
                        {motorcycle.brand}{" "}
                        {motorcycle.model}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="field">
                <label>Mecánico</label>

                <select
                  value={form.mechanic_id}
                  onChange={(e) =>
                    updateField(
                      "mechanic_id",
                      e.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    Sin asignar
                  </option>

                  {mechanics.map((mechanic) => (
                    <option
                      key={mechanic.id}
                      value={mechanic.id}
                    >
                      {mechanic.full_name}
                      {mechanic.specialty
                        ? ` · ${mechanic.specialty}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>
                  Kilometraje de recepción *
                </label>

                <input
                  type="number"
                  min="0"
                  required
                  value={form.mileage}
                  onChange={(e) =>
                    updateField(
                      "mileage",
                      e.target.value
                    )
                  }
                  disabled={saving}
                />
              </div>

              <div
                className="field"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>
                  Problema reportado
                </label>

                <textarea
                  rows={3}
                  value={
                    form.reported_problem
                  }
                  onChange={(e) =>
                    updateField(
                      "reported_problem",
                      e.target.value
                    )
                  }
                  placeholder="Describe el problema indicado por el cliente..."
                  disabled={saving}
                />
              </div>

              <div
                className="field"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>
                  Observaciones de recepción
                </label>

                <textarea
                  rows={3}
                  value={form.observations}
                  onChange={(e) =>
                    updateField(
                      "observations",
                      e.target.value
                    )
                  }
                  placeholder="Daños visibles, accesorios, recomendaciones..."
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>
                  Entrega estimada
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.estimated_delivery_at
                  }
                  onChange={(e) =>
                    updateField(
                      "estimated_delivery_at",
                      e.target.value
                    )
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {form.customer_id &&
              form.motorcycle_id && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 8,
                    background: "#f7f9f8",
                    fontSize: 12,
                  }}
                >
                  <strong>
                    Motocicleta seleccionada
                  </strong>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#687270",
                    }}
                  >
                    {
                      filteredMotorcycles.find(
                        (motorcycle) =>
                          motorcycle.id ===
                          form.motorcycle_id
                      )?.plate
                    }{" "}
                    ·{" "}
                    {
                      filteredMotorcycles.find(
                        (motorcycle) =>
                          motorcycle.id ===
                          form.motorcycle_id
                      )?.brand
                    }{" "}
                    {
                      filteredMotorcycles.find(
                        (motorcycle) =>
                          motorcycle.id ===
                          form.motorcycle_id
                      )?.model
                    }
                  </div>
                </div>
              )}

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#fff0f0",
                  color: "#a52222",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Plus size={15} />

                {saving
                  ? "Creando..."
                  : "Crear orden"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Column({
  title,
  items,
}: {
  title: string;
  items: ServiceOrder[];
}) {
  return (
    <div className="status-col">
      <h3>
        {title}

        <span
          style={{
            float: "right",
            color: "#8a9290",
          }}
        >
          {items.length}
        </span>
      </h3>

      {items.length ? (
        items.map((order) => {
          const customer = one(order.customer);
          const motorcycle = one(order.motorcycle);
          const mechanic = one(order.mechanic);

          return (
            <div
              className="order-card"
              key={order.id}
            >
              <strong>
                #{order.order_number}
                {" · "}
                {motorcycle?.plate ?? "—"}
              </strong>

              <div>
                {customer?.full_name ?? "—"}
              </div>

              <div
                style={{
                  color: "#78817f",
                  marginTop: 4,
                }}
              >
                {mechanic?.full_name ??
                  "Sin mecánico"}
                {" · "}
                {money(Number(order.total ?? 0))}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "#8a9290",
                  marginTop: 5,
                }}
              >
                {dateTimeLocalLabel(
                  order.received_at
                )}
              </div>

              <div
                className="progress"
                style={{
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    width: `${progressForStatus(
                      order.status
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div
          className="empty"
          style={{ padding: 18 }}
        >
          Sin órdenes
        </div>
      )}
    </div>
  );
}

function progressForStatus(status: OrderStatus) {
  const progress: Record<
    OrderStatus,
    number
  > = {
    received: 10,
    diagnosis: 25,
    quote: 35,
    approved: 50,
    repair: 70,
    quality: 85,
    ready: 95,
    delivered: 100,
    cancelled: 0,
  };

  return progress[status];
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 40,
  padding: 18,
  overflowY: "auto",
};

const modal: React.CSSProperties = {
  width: "min(760px, 100%)",
  maxHeight: "calc(100vh - 36px)",
  overflowY: "auto",
};