"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PhotoType = "arrival" | "departure";

type Photo = {
  id: string;
  organization_id: string;
  service_order_id: string;
  photo_type: PhotoType;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  signed_url?: string;
};

export default function ServiceOrderPhotos({
  organizationId,
  orderId,
}: {
  organizationId: string;
  orderId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const arrivalInput = useRef<HTMLInputElement | null>(null);
  const departureInput = useRef<HTMLInputElement | null>(null);
  const [arrival, setArrival] = useState<Photo[]>([]);
  const [departure, setDeparture] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<PhotoType | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPhotos() {
    try {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("service_order_photos")
        .select(
          "id,organization_id,service_order_id,photo_type,file_path,file_name,mime_type,file_size,notes,created_at"
        )
        .eq("organization_id", organizationId)
        .eq("service_order_id", orderId)
        .order("created_at", { ascending: true });

      if (queryError) throw queryError;

      const rows = (data ?? []) as Photo[];
      const withUrls = await Promise.all(
        rows.map(async (photo) => {
          const { data: signed, error: signError } = await supabase.storage
            .from("service-order-photos")
            .createSignedUrl(photo.file_path, 60 * 60);

          return {
            ...photo,
            signed_url: signError ? undefined : signed?.signedUrl,
          };
        })
      );

      setArrival(withUrls.filter((photo) => photo.photo_type === "arrival"));
      setDeparture(withUrls.filter((photo) => photo.photo_type === "departure"));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar las fotografías.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPhotos();
  }, [organizationId, orderId]);

  async function uploadPhotos(type: PhotoType, files: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      setUploading(type);
      setError("");
      setMessage("");

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`El archivo ${file.name} no es una imagen.`);
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`La imagen ${file.name} supera el límite de 10 MB.`);
        }

        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${crypto.randomUUID()}.${extension}`;
        const filePath = `${organizationId}/${orderId}/${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("service-order-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from("service_order_photos")
          .insert({
            organization_id: organizationId,
            service_order_id: orderId,
            photo_type: type,
            file_path: filePath,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          });

        if (insertError) {
          await supabase.storage.from("service-order-photos").remove([filePath]);
          throw insertError;
        }
      }

      setMessage(
        type === "arrival"
          ? "Fotografías de recepción guardadas correctamente."
          : "Fotografías de salida guardadas correctamente."
      );

      await loadPhotos();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible subir las fotografías.");
    } finally {
      setUploading(null);
      if (arrivalInput.current) arrivalInput.current.value = "";
      if (departureInput.current) departureInput.current.value = "";
    }
  }

  async function deletePhoto(photo: Photo) {
    const confirmed = window.confirm(
      `¿Eliminar la fotografía ${photo.file_name || "seleccionada"}?`
    );
    if (!confirmed) return;

    try {
      setError("");
      const { error: storageError } = await supabase.storage
        .from("service-order-photos")
        .remove([photo.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("service_order_photos")
        .delete()
        .eq("id", photo.id);
      if (dbError) throw dbError;

      setMessage("Fotografía eliminada correctamente.");
      await loadPhotos();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible eliminar la fotografía.");
    }
  }

  function Gallery({ title, photos, type }: { title: string; photos: Photo[]; type: PhotoType }) {
    return (
      <div className="card">
        <div className="section-head">
          <h3>{title}</h3>
          <Camera size={16} />
        </div>

        <input
          ref={type === "arrival" ? arrivalInput : departureInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          style={{ display: "none" }}
          onChange={(event) => uploadPhotos(type, event.target.files)}
        />

        <button
          type="button"
          className="btn btn-ghost"
          disabled={uploading !== null}
          onClick={() =>
            (type === "arrival" ? arrivalInput : departureInput).current?.click()
          }
        >
          <UploadCloud size={14} />
          {uploading === type ? "Subiendo..." : "Tomar / seleccionar fotos"}
        </button>

        {photos.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            <ImageIcon size={18} />
            <div style={{ marginTop: 6 }}>No hay fotografías registradas.</div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  border: "1px solid #e5e9e8",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {photo.signed_url ? (
                  <img
                    src={photo.signed_url}
                    alt={photo.file_name || title}
                    style={{
                      width: "100%",
                      height: 150,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 150,
                      display: "grid",
                      placeItems: "center",
                      background: "#f5f7f7",
                      color: "#6a7471",
                    }}
                  >
                    Imagen no disponible
                  </div>
                )}
                <div style={{ padding: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#707a77",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {photo.file_name || "Foto"}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: 6, width: "100%" }}
                    onClick={() => deletePhoto(photo)}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div>
          <div className="eyebrow">Evidencia fotográfica</div>
          <h2 className="page-title" style={{ fontSize: 18 }}>
            Recepción y salida de la motocicleta
          </h2>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 10,
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

      {error && (
        <div
          style={{
            marginBottom: 10,
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

      {loading ? (
        <div className="card">Cargando fotografías...</div>
      ) : (
        <div className="grid grid-2">
          <Gallery title="Fotos de recepción" photos={arrival} type="arrival" />
          <Gallery title="Fotos de salida" photos={departure} type="departure" />
        </div>
      )}
    </section>
  );
}
