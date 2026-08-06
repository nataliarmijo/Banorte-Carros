"use client";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function MapaPage() {
  return (
    <PlaceholderPage
      title="Mapa"
      description="Esta vista servirá para visualizar la ubicación en tiempo real de los vehículos asignados y las rutas activas."
      highlights={["Ubicación GPS", "Rutas activas", "Alertas geográficas"]}
    />
  );
}
