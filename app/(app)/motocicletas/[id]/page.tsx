import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Gauge,
  ImageIcon,
  Wrench,
  UserRound,
  Bike,
  MapPin,
} from "lucide-react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function MotoFicha({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: motorcycle, error } = await supabase
    .from("motorcycles")
    .select(`
      id,
      organization_id,
      customer_id,
      plate,
      vin,
      brand,
      model,
      year,
      color,
      engine_cc,
      current_km,
      next_maintenance_km,
      next_maintenance_date,
      notes,
      active,
      created_at,
      updated_at,
      customer:customers (
        id,
        full_name,
        phone,
        whatsapp,
        email,
        address
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error cargando motocicleta:", error);
  }

  if (!motorcycle) {
    notFound();
  }

  const customer = Array.isArray(motorcycle.customer)
    ? motorcycle.customer[0] ?? null
    : motorcycle.customer;

  const kmRemaining =
    motorcycle.next_maintenance_km !== null
      ? motorcycle.next_maintenance_km - motorcycle.current_km
      : null;

  const maintenanceDate = motorcycle.next_maintenance_date
    ? new Date(
        `${motorcycle.next_maintenance_date}T00:00:00`
      )
    : null;

  const today = new Date();

  let maintenanceLabel = "No configurado";
  let maintenanceTone = "#737c7a";

  if (
    (kmRemaining !== null && kmRemaining <= 0) ||
    (maintenanceDate && maintenanceDate < today)
  ) {
    maintenanceLabel = "Mantenimiento vencido";
    maintenanceTone = "#b42318";
  } else if (
    (kmRemaining !== null && kmRemaining <= 500) ||
    (maintenanceDate &&
      maintenanceDate.getTime() - today.getTime() <
        30 * 24 * 60 * 60 * 1000)
  ) {
    maintenanceLabel = "Mantenimiento próximo";
    maintenanceTone = "#9a6700";
  } else if (
    motorcycle.next_maintenance_km !== null ||
    motorcycle.next_maintenance_date
  ) {
    maintenanceLabel = "Mantenimiento programado";
    maintenanceTone = "#0c6b58";
  }

  return (
    <>
      <Link
        href="/motocicletas"
        className="btn btn-ghost"
      >
        <ArrowLeft size={14} />
        Volver a motocicletas
      </Link>

      <div style={{ height: 12 }} />

      {/* HERO */}
      <div className="hero">
        <div
          className="eyebrow"
          style={{ color: "#51e6c2" }}
        >
          Ficha de motocicleta
        </div>

        <h2>
          {motorcycle.brand} {motorcycle.model} —{" "}
          {motorcycle.plate}
        </h2>

        <p>
          Propietario:{" "}
          <strong>
            {customer?.full_name ??
              "Cliente no disponible"}
          </strong>
          . Información centralizada de la motocicleta,
          mantenimiento y futuras órdenes de servicio.
        </p>

        <div className="kpi-line">
          <div>
            <strong>
              {motorcycle.current_km.toLocaleString(
                "es-CO"
              )}
            </strong>
            Kilometraje
          </div>

          <div>
            <strong>
              {motorcycle.next_maintenance_km
                ? motorcycle.next_maintenance_km.toLocaleString(
                    "es-CO"
                  )
                : "—"}
            </strong>
            Próximo mantenimiento
          </div>

          <div>
            <strong>
              {motorcycle.active
                ? "Activa"
                : "Inactiva"}
            </strong>
            Estado
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* DATOS PRINCIPALES */}
      <div className="grid grid-3">
        <div className="card">
          <div className="section-head">
            <h2>Datos de la motocicleta</h2>
            <Bike size={16} />
          </div>

          <div
            className="grid"
            style={{
              gap: 10,
              fontSize: 12,
            }}
          >
            <div>
              <span className="muted">Marca</span>
              <strong style={{ display: "block" }}>
                {motorcycle.brand}
              </strong>
            </div>

            <div>
              <span className="muted">Modelo</span>
              <strong style={{ display: "block" }}>
                {motorcycle.model}
              </strong>
            </div>

            <div>
              <span className="muted">Placa</span>
              <strong style={{ display: "block" }}>
                {motorcycle.plate}
              </strong>
            </div>

            <div>
              <span className="muted">Año</span>
              <strong style={{ display: "block" }}>
                {motorcycle.year ?? "No registrado"}
              </strong>
            </div>

            <div>
              <span className="muted">
                Cilindraje
              </span>
              <strong style={{ display: "block" }}>
                {motorcycle.engine_cc
                  ? `${motorcycle.engine_cc} cc`
                  : "No registrado"}
              </strong>
            </div>

            <div>
              <span className="muted">Color</span>
              <strong style={{ display: "block" }}>
                {motorcycle.color ?? "No registrado"}
              </strong>
            </div>

            <div>
              <span className="muted">
                VIN / Chasis
              </span>
              <strong style={{ display: "block" }}>
                {motorcycle.vin ?? "No registrado"}
              </strong>
            </div>
          </div>
        </div>

        {/* CLIENTE */}
        <div className="card">
          <div className="section-head">
            <h2>Propietario</h2>
            <UserRound size={16} />
          </div>

          {customer ? (
            <div
              className="grid"
              style={{
                gap: 10,
                fontSize: 12,
              }}
            >
              <div>
                <span className="muted">
                  Nombre completo
                </span>

                <strong
                  style={{
                    display: "block",
                    fontSize: 14,
                  }}
                >
                  {customer.full_name}
                </strong>
              </div>

              <div>
                <span className="muted">
                  Teléfono
                </span>

                <strong style={{ display: "block" }}>
                  {customer.phone ?? "No registrado"}
                </strong>
              </div>

              <div>
                <span className="muted">
                  WhatsApp
                </span>

                <strong style={{ display: "block" }}>
                  {customer.whatsapp ??
                    "No registrado"}
                </strong>
              </div>

              <div>
                <span className="muted">Correo</span>

                <strong style={{ display: "block" }}>
                  {customer.email ??
                    "No registrado"}
                </strong>
              </div>

              <div>
                <span className="muted">
                  Dirección
                </span>

                <strong
                  style={{
                    display: "block",
                  }}
                >
                  {customer.address ??
                    "No registrada"}
                </strong>
              </div>
            </div>
          ) : (
            <div className="empty">
              No fue posible cargar el propietario.
            </div>
          )}
        </div>

        {/* MANTENIMIENTO */}
        <div className="card">
          <div className="section-head">
            <h2>Mantenimiento</h2>
            <CalendarClock size={16} />
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "#f7f9f8",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#737c7a",
              }}
            >
              Estado
            </div>

            <strong
              style={{
                display: "block",
                marginTop: 3,
                color: maintenanceTone,
              }}
            >
              {maintenanceLabel}
            </strong>
          </div>

          <div
            className="grid"
            style={{
              gap: 10,
              marginTop: 14,
              fontSize: 12,
            }}
          >
            <div>
              <span className="muted">
                Kilometraje actual
              </span>

              <strong style={{ display: "block" }}>
                {motorcycle.current_km.toLocaleString(
                  "es-CO"
                )}{" "}
                km
              </strong>
            </div>

            <div>
              <span className="muted">
                Próximo mantenimiento
              </span>

              <strong style={{ display: "block" }}>
                {motorcycle.next_maintenance_km
                  ? `${motorcycle.next_maintenance_km.toLocaleString(
                      "es-CO"
                    )} km`
                  : "No configurado"}
              </strong>
            </div>

            {kmRemaining !== null && (
              <div>
                <span className="muted">
                  Diferencia
                </span>

                <strong style={{ display: "block" }}>
                  {kmRemaining > 0
                    ? `${kmRemaining.toLocaleString(
                        "es-CO"
                      )} km restantes`
                    : `${Math.abs(
                        kmRemaining
                      ).toLocaleString(
                        "es-CO"
                      )} km vencidos`}
                </strong>
              </div>
            )}

            <div>
              <span className="muted">
                Fecha programada
              </span>

              <strong style={{ display: "block" }}>
                {motorcycle.next_maintenance_date
                  ? new Date(
                      `${motorcycle.next_maintenance_date}T00:00:00`
                    ).toLocaleDateString("es-CO")
                  : "No configurada"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* INFORMACIÓN ADICIONAL */}
      <div className="grid grid-2">
        <div className="card">
          <div className="section-head">
            <h2>Información adicional</h2>
            <Gauge size={16} />
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {motorcycle.notes ? (
              motorcycle.notes
            ) : (
              <span className="muted">
                No hay observaciones registradas.
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Ubicación / contacto</h2>
            <MapPin size={16} />
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <strong>
              {customer?.full_name ??
                "Cliente no disponible"}
            </strong>

            <div className="muted">
              {customer?.address ??
                "Dirección no registrada"}
            </div>

            {customer?.phone && (
              <div
                style={{
                  marginTop: 8,
                }}
              >
                📱 {customer.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* HISTORIAL */}
      <div className="card">
        <div className="section-head">
          <div>
            <h2>Historial de servicios</h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Las órdenes de servicio aparecerán aquí
              cuando esté habilitado el módulo de órdenes.
            </div>
          </div>

          <button
            className="btn btn-ghost"
            disabled
            title="Disponible cuando se implemente el módulo de órdenes"
          >
            <Wrench size={14} />
            Nueva orden
          </button>
        </div>

        <div
          className="empty"
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          <Wrench
            size={30}
            style={{
              margin: "0 auto 10px",
              opacity: 0.35,
            }}
          />

          <strong>
            Sin órdenes de servicio registradas
          </strong>

          <div
            className="muted"
            style={{
              marginTop: 5,
              fontSize: 11,
            }}
          >
            El historial se conectará automáticamente
            con las órdenes de servicio de esta motocicleta.
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      {/* FOTOS */}
      <div className="card">
        <div className="section-head">
          <div>
            <h2>Recepción y evidencia</h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Fotografías asociadas a la motocicleta.
            </div>
          </div>

          <button
            className="btn btn-ghost"
            disabled
            title="Supabase Storage se implementará posteriormente"
          >
            <ImageIcon size={14} />
            Subir fotografías
          </button>
        </div>

        <div className="photo-grid">
          <div className="photo-placeholder">
            Frontal
          </div>

          <div className="photo-placeholder">
            Lateral
          </div>

          <div className="photo-placeholder">
            Tablero
          </div>

          <div className="photo-placeholder">
            Daños
          </div>
        </div>

        <div className="footer-note">
          La gestión de fotografías se conectará
          posteriormente con Supabase Storage.
        </div>
      </div>
    </>
  );
}