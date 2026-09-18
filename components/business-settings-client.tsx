"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Building2,
  ImagePlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  getCurrentOrganizationId,
} from "@/lib/motomil/organization";

import {
  removeWorkshopLogo,
  uploadWorkshopLogo,
  createWorkshopLogoSignedUrl,
  validateWorkshopLogoFile,
} from "@/lib/tallerpro/workshop-storage";

type FormState = {
  name: string;
  legal_name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
};

export default function BusinessSettingsClient() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [orgId, setOrgId] = useState("");

  const [form, setForm] =
    useState<FormState>({
      name: "",
      legal_name: "",
      tax_id: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      country: "CO",
      currency: "COP",
    });

  const [logoPath, setLogoPath] =
    useState<string | null>(null);

  const [logoUrl, setLogoUrl] =
    useState<string | null>(null);

  const [selectedLogo, setSelectedLogo] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [removingLogo, setRemovingLogo] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const organizationId =
          await getCurrentOrganizationId();

        if (!mounted) return;

        setOrgId(organizationId);

        const {
          data,
          error: organizationError,
        } = await supabase
          .from("organizations")
          .select(
            `
              name,
              legal_name,
              tax_id,
              nit,
              phone,
              email,
              address,
              city,
              country,
              currency,
              logo_url
            `
          )
          .eq("id", organizationId)
          .single();

        if (organizationError) {
          throw organizationError;
        }

        if (!data) {
          throw new Error(
            "No fue posible cargar los datos del taller."
          );
        }

        setForm({
          name: data.name ?? "",
          legal_name: data.legal_name ?? "",
          tax_id:
            data.tax_id ??
            data.nit ??
            "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          country: data.country ?? "CO",
          currency:
            data.currency ?? "COP",
        });

        setLogoPath(
          data.logo_url ?? null
        );

        if (data.logo_url) {
          const signedUrl =
            await createWorkshopLogoSignedUrl(
              supabase,
              data.logo_url
            );

          if (mounted) {
            setLogoUrl(signedUrl);
          }
        } else {
          setLogoUrl(null);
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar la configuración."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedLogo) {
      setPreviewUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(selectedLogo);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedLogo]);

  function updateField(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleLogoSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    try {
      validateWorkshopLogoFile(file);

      setError("");
      setMessage("");
      setSelectedLogo(file);
    } catch (err) {
      setSelectedLogo(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setError(
        err instanceof Error
          ? err.message
          : "El logo no es válido."
      );
    }
  }

  async function saveWorkshopData(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!orgId) {
        throw new Error(
          "No hay una organización seleccionada."
        );
      }

      /*
       * Primero guardamos los datos comerciales.
       */
      const { error: organizationError } =
        await supabase
          .from("organizations")
          .update({
            name: form.name.trim(),
            legal_name:
              form.legal_name.trim() ||
              null,
            tax_id:
              form.tax_id.trim() ||
              null,
            phone:
              form.phone.trim() ||
              null,
            email:
              form.email.trim() ||
              null,
            address:
              form.address.trim() ||
              null,
            city:
              form.city.trim() ||
              null,
            country:
              form.country.trim() ||
              "CO",
            currency:
              form.currency.trim() ||
              "COP",
          })
          .eq("id", orgId);

      if (organizationError) {
        throw organizationError;
      }

      /*
       * Si se seleccionó un nuevo logo:
       *
       * 1. Se sube el nuevo archivo.
       * 2. Se guarda la nueva ruta.
       * 3. Se elimina el archivo anterior.
       */
      if (selectedLogo) {
        const previousLogoPath =
          logoPath;

        const newLogoPath =
          await uploadWorkshopLogo(
            supabase,
            orgId,
            selectedLogo
          );

        const {
          error: logoUpdateError,
        } = await supabase
          .from("organizations")
          .update({
            logo_url: newLogoPath,
          })
          .eq("id", orgId);

        if (logoUpdateError) {
          /*
           * Si la base de datos no pudo guardar
           * la nueva ruta, intentamos borrar el
           * archivo recién subido.
           */
          try {
            await removeWorkshopLogo(
              supabase,
              newLogoPath
            );
          } catch {
            // No ocultamos el error principal.
          }

          throw logoUpdateError;
        }

        /*
         * El archivo anterior ya no es necesario.
         */
        if (
          previousLogoPath &&
          previousLogoPath !== newLogoPath
        ) {
          try {
            await removeWorkshopLogo(
              supabase,
              previousLogoPath
            );
          } catch {
            /*
             * No bloqueamos la operación porque
             * la nueva imagen ya quedó activa.
             */
          }
        }

        const newSignedUrl =
          await createWorkshopLogoSignedUrl(
            supabase,
            newLogoPath
          );

        setLogoPath(newLogoPath);
        setLogoUrl(newSignedUrl);
        setSelectedLogo(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }

      setMessage(
        "Configuración del taller guardada correctamente."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la configuración."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLogo() {
    if (!orgId || !logoPath) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Deseas eliminar el logo actual del taller?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingLogo(true);
      setError("");
      setMessage("");

      const {
        error: updateError,
      } = await supabase
        .from("organizations")
        .update({
          logo_url: null,
        })
        .eq("id", orgId);

      if (updateError) {
        throw updateError;
      }

      try {
        await removeWorkshopLogo(
          supabase,
          logoPath
        );
      } catch {
        /*
         * El vínculo ya fue eliminado de la organización.
         * Una falla al borrar el objeto no debe impedir
         * que el usuario vea el resultado correcto.
         */
      }

      setLogoPath(null);
      setLogoUrl(null);
      setSelectedLogo(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage(
        "Logo eliminado correctamente."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el logo."
      );
    } finally {
      setRemovingLogo(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        Cargando configuración del taller...
      </div>
    );
  }

  const visibleLogo =
    previewUrl ||
    logoUrl ||
    null;

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            Configuración
          </div>

          <h2>
            Configuración del taller
          </h2>

          <div className="muted">
            Estos datos se utilizarán en facturas,
            cotizaciones, órdenes, comprobantes y
            documentos generados por el sistema.
          </div>
        </div>

        <Building2 size={18} />
      </div>

      {message && (
        <div
          className="alert"
          style={{
            marginBottom: 14,
          }}
        >
          <span className="dot" />
          <div>{message}</div>
        </div>
      )}

      {error && (
        <div
          className="alert"
          style={{
            marginBottom: 14,
            color: "#a52222",
            background: "#fff0f0",
          }}
        >
          <span className="dot red" />
          <div>{error}</div>
        </div>
      )}

      <form
        className="form-grid"
        onSubmit={saveWorkshopData}
      >
        <div
          className="card"
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gap: 14,
          }}
        >
          <div className="section-head">
            <div>
              <h2>
                Identidad del taller
              </h2>

              <div className="muted">
                Este logo aparecerá en los documentos
                generados para este negocio.
              </div>
            </div>

            <ImagePlus size={18} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(130px, 220px) 1fr",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                minHeight: 150,
                border: "1px dashed #ccd6d2",
                borderRadius: 14,
                background: "#f7faf9",
                display: "grid",
                placeItems: "center",
                padding: 12,
              }}
            >
              {visibleLogo ? (
                <img
                  src={visibleLogo}
                  alt="Logo del taller"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: 130,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#7b8582",
                    fontSize: 12,
                  }}
                >
                  Sin logo
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <strong>
                  Logo del negocio
                </strong>

                <div
                  className="muted"
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  Formatos permitidos: PNG, JPG o
                  WEBP. Tamaño máximo: 2 MB.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoSelect}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={saving || removingLogo}
                >
                  <Upload size={14} />

                  {selectedLogo
                    ? "Cambiar selección"
                    : "Seleccionar logo"}
                </button>

                {(logoPath || selectedLogo) && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setSelectedLogo(null);

                      if (
                        fileInputRef.current
                      ) {
                        fileInputRef.current.value =
                          "";
                      }
                    }}
                    disabled={
                      saving || removingLogo
                    }
                  >
                    Cancelar selección
                  </button>
                )}

                {logoPath && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={deleteLogo}
                    disabled={
                      saving || removingLogo
                    }
                  >
                    <Trash2 size={14} />

                    {removingLogo
                      ? "Eliminando..."
                      : "Eliminar logo"}
                  </button>
                )}
              </div>

              {selectedLogo && (
                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                  }}
                >
                  Archivo seleccionado:{" "}
                  <strong>
                    {selectedLogo.name}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <label>
            Nombre comercial
          </label>

          <input
            value={form.name}
            required
            onChange={(event) =>
              updateField(
                "name",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Razón social
          </label>

          <input
            value={form.legal_name}
            onChange={(event) =>
              updateField(
                "legal_name",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            NIT / Identificación
          </label>

          <input
            value={form.tax_id}
            onChange={(event) =>
              updateField(
                "tax_id",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Teléfono
          </label>

          <input
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(event) =>
              updateField(
                "phone",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Correo
          </label>

          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              updateField(
                "email",
                event.target.value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            Ciudad
          </label>

          <input
            value={form.city}
            onChange={(event) =>
              updateField(
                "city",
                event.target.value
              )
            }
          />
        </div>

        <div className="field full">
          <label>
            Dirección
          </label>

          <input
            value={form.address}
            onChange={(event) =>
              updateField(
                "address",
                event.target.value
              )
            }
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              saving || removingLogo
            }
          >
            <Save size={14} />

            {saving
              ? "Guardando..."
              : "Guardar configuración"}
          </button>
        </div>
      </form>
    </div>
  );
}