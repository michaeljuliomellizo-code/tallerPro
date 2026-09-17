"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Mail, Pencil, Phone, Plus, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

type Supplier = {
  id: string;
  organization_id: string;
  name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export default function SuppliersClient() {
  const supabase = createClient();

  const [organizationId, setOrganizationId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const orgId = organizationId || (await getCurrentOrganizationId());
      if (!orgId) {
        throw new Error("El usuario no tiene una organización asignada.");
      }

      setOrganizationId(orgId);

      const { data, error: supplierError } = await supabase
        .from("suppliers")
        .select(
          "id, organization_id, name, contact_name, phone, email, address, tax_id, notes, active, created_at"
        )
        .eq("organization_id", orgId)
        .order("name", { ascending: true });

      if (supplierError) throw supplierError;
      setSuppliers((data ?? []) as Supplier[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los proveedores."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxId("");
    setNotes("");
  }

  function editSupplier(supplier: Supplier) {
    setEditingId(supplier.id);
    setName(supplier.name || "");
    setContactName(supplier.contact_name || "");
    setPhone(supplier.phone || "");
    setEmail(supplier.email || "");
    setAddress(supplier.address || "");
    setTaxId(supplier.tax_id || "");
    setNotes(supplier.notes || "");
    setShowForm(true);
    setError("");
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    resetForm();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const orgId = organizationId || (await getCurrentOrganizationId());
      if (!orgId) throw new Error("No existe organización activa.");

      const payload = {
        organization_id: orgId,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
        address: address.trim() || null,
        tax_id: taxId.trim() || null,
        notes: notes.trim() || null,
        active: true,
        updated_at: new Date().toISOString(),
      };

      const result = editingId
        ? await supabase
            .from("suppliers")
            .update(payload)
            .eq("id", editingId)
            .eq("organization_id", orgId)
        : await supabase.from("suppliers").insert(payload);

      if (result.error) throw result.error;

      setMessage(
        editingId
          ? "Proveedor actualizado correctamente."
          : "Proveedor creado correctamente."
      );

      closeForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el proveedor."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(supplier: Supplier) {
    try {
      setError("");
      setMessage("");

      const { error: updateError } = await supabase
        .from("suppliers")
        .update({
          active: !supplier.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplier.id)
        .eq("organization_id", organizationId);

      if (updateError) throw updateError;

      setMessage(
        supplier.active
          ? "Proveedor desactivado."
          : "Proveedor activado."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el proveedor."
      );
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const text = `${supplier.name ?? ""} ${
        supplier.contact_name ?? ""
      } ${supplier.phone ?? ""} ${supplier.email ?? ""} ${
        supplier.tax_id ?? ""
      }`.toLowerCase();

      return !term || text.includes(term);
    });
  }, [suppliers, search]);

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div className="eyebrow">Gestión</div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">
            Gestiona los proveedores que abastecen el inventario del taller.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setError("");
            setShowForm(true);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <Plus size={15} />
          Nuevo proveedor
        </button>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: "#effaf6",
            color: "#0c6b58",
            border: "1px solid #b9e4d8",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: "#fff5f5",
            color: "#9b1c1c",
            border: "1px solid #f2b8b8",
          }}
        >
          {error}
        </div>
      )}

      <div className="toolbar">
        <div className="search" style={{ flex: 1, minWidth: 280 }}>
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar proveedor, contacto, teléfono, correo o NIT..."
          />
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Proveedores</h2>
            <div className="muted">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted">Cargando proveedores...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Building2 size={22} />
            <strong>No hay proveedores registrados.</strong>
            <span className="muted">
              Agrega el primer proveedor para comenzar a gestionar abastecimiento.
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>NIT</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name || "Sin nombre"}</strong>
                      {supplier.address && (
                        <div className="muted">
                          {supplier.address}
                        </div>
                      )}
                    </td>
                    <td>{supplier.contact_name || "—"}</td>
                    <td>{supplier.phone || "—"}</td>
                    <td>{supplier.email || "—"}</td>
                    <td>{supplier.tax_id || "—"}</td>
                    <td>
                      <span
                        className={
                          supplier.active
                            ? "badge badge-success"
                            : "badge badge-danger"
                        }
                      >
                        {supplier.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="btn btn-ghost"
                          onClick={() => editSupplier(supplier)}
                          title="Editar proveedor"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          className="btn btn-ghost"
                          onClick={() => void toggleActive(supplier)}
                        >
                          {supplier.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div style={modalBackdrop} onClick={closeForm}>
          <form
            className="card"
            style={modalCard}
            onSubmit={save}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">Gestión</div>
                <h2>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</h2>
                <p className="page-subtitle">
                  Información comercial y de contacto del proveedor.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeForm}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field field-full">
                <label htmlFor="supplier-name">Nombre del proveedor *</label>
                <input
                  id="supplier-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre comercial"
                />
              </div>

              <div className="field">
                <label htmlFor="supplier-contact">Contacto</label>
                <input
                  id="supplier-contact"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Nombre del contacto"
                />
              </div>

              <div className="field">
                <label htmlFor="supplier-tax">NIT / identificación</label>
                <input
                  id="supplier-tax"
                  value={taxId}
                  onChange={(event) => setTaxId(event.target.value)}
                  placeholder="NIT"
                />
              </div>

              <div className="field">
                <label htmlFor="supplier-phone">Teléfono</label>
                <div className="input-with-icon">
                  <Phone size={14} />
                  <input
                    id="supplier-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="supplier-email">Correo</label>
                <div className="input-with-icon">
                  <Mail size={14} />
                  <input
                    id="supplier-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>

              <div className="field field-full">
                <label htmlFor="supplier-address">Dirección</label>
                <input
                  id="supplier-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Dirección"
                />
              </div>

              <div className="field field-full">
                <label htmlFor="supplier-notes">Notas</label>
                <textarea
                  id="supplier-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Condiciones comerciales, observaciones..."
                />
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
                type="button"
                className="btn btn-ghost"
                onClick={closeForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Building2 size={14} />
                {saving ? "Guardando..." : "Guardar proveedor"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1100,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  padding: 18,
};

const modalCard: React.CSSProperties = {
  width: "min(760px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
};
