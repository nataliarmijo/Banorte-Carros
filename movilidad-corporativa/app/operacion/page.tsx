"use client";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function OperacionPage() {
  return (
    <PlaceholderPage
      title="Operación de flota"
      description="Este módulo permitirá ver el estado operativo de los vehículos, las asignaciones y la disponibilidad del día."
      highlights={["Disponibilidad por vehículo", "Asignaciones del día", "Alertas de operación"]}
    />
  );
}
