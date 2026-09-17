"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Status } from "@/components/module-page";

type Customer = {
  id: string;
  organization_id: string;
  full_name: string;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ModalMode = "create" | "edit" | "detail" | null;

export default function CustomersClient() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function getOrganizationId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(
        `No fue posible obtener el usuario autenticado: ${userError.message}`
      );
    }

    if (!user) {
      throw new Error("No existe una sesión activa.");
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(
        `No fue posible obtener la organización: ${membershipError.message}`
      );
    }

    if (!membership?.organization_id) {
      throw new Error(
        "El usuario autenticado no tiene una organización asignada."
      );
    }

    return membership.organization_id;
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const organizationId = await getOrganizationId();

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (customersError) {
        throw new Error(
          `No fue posible cargar los clientes: ${customersError.message}`
        );
      }

      setRows(data ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error cargando los clientes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();

    if (!search) return rows;

    return rows.filter((customer) =>
      [
        customer.full_name,
        customer.phone,
        customer.email,
        customer.document_number,
        customer.whatsapp,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [rows, q]);

  function resetForm() {
    setName("");
    setDocumentNumber("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setAddress("");
    setNotes("");
  }

  function closeModal() {
    if (saving || changingStatus) return;

    setModalMode(null);
    setSelectedCustomer(null);
    resetForm();
    setError("");
  }

  function openCreate() {
    resetForm();
    setSelectedCustomer(null);
    setError("");
    setSuccess("");
    setModalMode("create");
  }

  function openEdit(customer: Customer) {
    setSelectedCustomer(customer);

    setName(customer.full_name);
    setDocumentNumber(customer.document_number ?? "");
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setWhatsapp(customer.whatsapp ?? "");
    setAddress(customer.address ?? "");
    setNotes(customer.notes ?? "");

    setError("");
    setSuccess("");
    setModalMode("edit");
  }

  function openDetail(customer: Customer) {
    setSelectedCustomer(customer);
    setError("");
    setModalMode("detail");
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    if (!phone.trim()) {
      setError("El teléfono es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const organizationId = await getOrganizationId();

      const payload = {
        full_name: name.trim(),
        document_number: documentNumber.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (modalMode === "create") {
        const { data: customer, error: insertError } = await supabase
          .from("customers")
          .insert({
            organization_id: organizationId,
            ...payload,
            active: true,
          })
          .select("*")
          .single();

        if (insertError) {
          throw new Error(
            `No fue posible guardar el cliente: ${insertError.message}`
          );
        }

        setRows((current) => [customer, ...current]);

        setSuccess("Cliente creado correctamente.");
        closeModal();
      }

      if (modalMode === "edit" && selectedCustomer) {
        const { data: customer, error: updateError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", selectedCustomer.id)
          .eq("organization_id", organizationId)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(
            `No fue posible actualizar el cliente: ${updateError.message}`
          );
        }

        setRows((current) =>
          current.map((item) =>
            item.id === customer.id ? customer : item
          )
        );

        setSuccess("Cliente actualizado correctamente.");
        closeModal();
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error guardando el cliente."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCustomerStatus(customer: Customer) {
    const action = customer.active ? "desactivar" : "activar";

    const confirmed = window.confirm(
      `¿Está seguro de ${action} al cliente "${customer.full_name}"?`
    );

    if (!confirmed) return;

    try {
      setChangingStatus(true);
      setError("");
      setSuccess("");

      const organizationId = await getOrganizationId();

      const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update({
          active: !customer.active,
        })
        .eq("id", customer.id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();

      if (updateError) {
        throw new Error(
          `No fue posible ${action} el cliente: ${updateError.message}`
        );
      }

      setRows((current) =>
        current.map((item) =>
          item.id === updatedCustomer.id ? updatedCustomer : item
        )
      );

      setSuccess(
        customer.active
          ? "Cliente desactivado correctamente."
          : "Cliente activado correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Ocurrió un error al ${action} el cliente.`
      );
    } finally {
      setChangingStatus(false);
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search size={15} />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, teléfono o correo..."
          />
        </div>

        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} />
          Nuevo cliente
        </button>
      </div>

      {success && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#e8fff7",
            color: "#087f5b",
            border: "1px solid #b7f3df",
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      {error && !modalMode && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fff1f2",
            color: "#b42318",
            border: "1px solid #fecdd3",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Motos</th>
                <th>Última visita</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#818a88",
                    }}
                  >
                    Cargando clientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#818a88",
                    }}
                  >
                    {q
                      ? "No se encontraron clientes."
                      : "Todavía no hay clientes registrados."}
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    style={{
                      opacity: customer.active ? 1 : 0.55,
                    }}
                  >
                    <td>
                      <strong>{customer.full_name}</strong>

                      <div
                        style={{
                          fontSize: 10,
                          color: "#818a88",
                        }}
                      >
                        {customer.email || "Sin correo"}
                      </div>
                    </td>

                    <td>
                      {customer.phone ||
                        customer.whatsapp ||
                        "Sin teléfono"}
                    </td>

                    <td>0</td>

                    <td>{formatDate(customer.created_at)}</td>

                    <td>
                      {customer.active ? (
                        <Status tone="green">Activo</Status>
                      ) : (
                        <Status tone="gray">Inactivo</Status>
                      )}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 5,
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Ver detalle"
                          onClick={() => openDetail(customer)}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          title="Editar cliente"
                          onClick={() => openEdit(customer)}
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          title={
                            customer.active
                              ? "Desactivar cliente"
                              : "Activar cliente"
                          }
                          onClick={() =>
                            toggleCustomerStatus(customer)
                          }
                          disabled={changingStatus}
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREAR / EDITAR */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div style={modalBackdrop}>
          <form onSubmit={save} className="card" style={modal}>
            <div className="section-head">
              <h2>
                {modalMode === "create"
                  ? "Nuevo cliente"
                  : "Editar cliente"}
              </h2>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#fff1f2",
                  color: "#b42318",
                  border: "1px solid #fecdd3",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div className="form-grid">
              <div className="field">
                <label>Nombre completo *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Pérez"
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>Documento</label>
                <input
                  value={documentNumber}
                  onChange={(e) =>
                    setDocumentNumber(e.target.value)
                  }
                  placeholder="Cédula / documento"
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>Teléfono *</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="300 555 1020"
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>WhatsApp</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="300 555 1020"
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>Dirección</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección"
                  disabled={saving}
                />
              </div>

              <div
                className="field"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>Observaciones</label>

                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones del cliente..."
                  disabled={saving}
                  style={{
                    width: "100%",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
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
                <UserPlus size={15} />

                {saving
                  ? "Guardando..."
                  : modalMode === "create"
                    ? "Guardar cliente"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETALLE */}
      {modalMode === "detail" && selectedCustomer && (
        <div style={modalBackdrop}>
          <div className="card" style={detailModal}>
            <div className="section-head">
              <div>
                <h2>{selectedCustomer.full_name}</h2>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: "#818a88",
                  }}
                >
                  Detalle del cliente
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                <X size={15} />
              </button>
            </div>

            <div style={detailHeader}>
              <div style={avatar}>
                {selectedCustomer.full_name
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word.charAt(0))
                  .join("")
                  .toUpperCase()}
              </div>

              <div>
                <strong
                  style={{
                    fontSize: 18,
                  }}
                >
                  {selectedCustomer.full_name}
                </strong>

                <div
                  style={{
                    marginTop: 5,
                  }}
                >
                  {selectedCustomer.active ? (
                    <Status tone="green">Cliente activo</Status>
                  ) : (
                    <Status tone="gray">Cliente inactivo</Status>
                  )}
                </div>
              </div>
            </div>

            <div style={statsGrid}>
              <div style={statCard}>
                <span>Motocicletas</span>
                <strong>0</strong>
                <small>Próximamente</small>
              </div>

              <div style={statCard}>
                <span>Órdenes</span>
                <strong>0</strong>
                <small>Próximamente</small>
              </div>

              <div style={statCard}>
                <span>Última visita</span>
                <strong>—</strong>
                <small>Sin historial</small>
              </div>
            </div>

            <div style={detailSection}>
              <h3>Información de contacto</h3>

              <div style={detailGrid}>
                <DetailItem
                  label="Documento"
                  value={selectedCustomer.document_number}
                />

                <DetailItem
                  label="Teléfono"
                  value={selectedCustomer.phone}
                />

                <DetailItem
                  label="WhatsApp"
                  value={selectedCustomer.whatsapp}
                />

                <DetailItem
                  label="Correo"
                  value={selectedCustomer.email}
                />

                <DetailItem
                  label="Dirección"
                  value={selectedCustomer.address}
                />

                <DetailItem
                  label="Fecha de registro"
                  value={formatDate(selectedCustomer.created_at)}
                />
              </div>
            </div>

            <div style={detailSection}>
              <h3>Observaciones</h3>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f7f9f8",
                  color: selectedCustomer.notes
                    ? "#343b39"
                    : "#818a88",
                  fontSize: 13,
                }}
              >
                {selectedCustomer.notes ||
                  "No hay observaciones registradas."}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => openEdit(selectedCustomer)}
              >
                <Pencil size={14} />
                Editar
              </button>

              <button
                className="btn btn-primary"
                onClick={closeModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#818a88",
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#222927",
        }}
      >
        {value || "No registrado"}
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 40,
  padding: 18,
};

const modal: React.CSSProperties = {
  width: "min(680px,100%)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const detailModal: React.CSSProperties = {
  width: "min(760px,100%)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const detailHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 0",
};

const avatar: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "#51e6c2",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontSize: 15,
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  margin: "8px 0 20px",
};

const statCard: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: "#f7f9f8",
  border: "1px solid #e6ebe9",
};

const detailSection: React.CSSProperties = {
  marginTop: 18,
};

const detailGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 18,
  paddingTop: 12,
};