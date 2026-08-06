"use client";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function NuevaSolicitudPage() {
  return (
    <PlaceholderPage
      title="Nueva solicitud"
      description="Aquí se capturará la solicitud del viaje, el motivo, la modalidad y los datos del origen y destino."
      highlights={["Formulario de solicitud", "Validación de horarios", "Selección de modalidad"]}
    />
  );
}
