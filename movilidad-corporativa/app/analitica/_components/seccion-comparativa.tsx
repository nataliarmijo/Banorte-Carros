"use client";

import type { DashboardAnalitica } from "@/lib/adapters/analitica";
import { PARAMS_CONFIG } from "@/lib/config/params";
import { MEDIO_LABELS } from "@/lib/ui/estado-solicitud";
import { TIPO_INCIDENCIA_LABELS } from "@/lib/ui/incidencias";
import { formatoMxn, formatoNumero, formatoOSinDatos, formatoPorcentaje } from "../_lib/formato";
import { SeccionCard, TablaSimple } from "./seccion-card";

function nombreTerritorio(territorioId: string): string {
  return PARAMS_CONFIG.territorios[territorioId as keyof typeof PARAMS_CONFIG.territorios]?.nombre ?? territorioId;
}

interface SeccionComparativaProps {
  matrizComparativa: DashboardAnalitica["matrizComparativa"];
  rankingTerritoriosPorAhorro: DashboardAnalitica["rankingTerritoriosPorAhorro"];
  rankingUnidadesSubutilizadas: DashboardAnalitica["rankingUnidadesSubutilizadas"];
  vehiculosExtremos: DashboardAnalitica["vehiculosExtremos"];
  incidenciasPorCategoria: DashboardAnalitica["incidenciasPorCategoria"];
}

export function SeccionComparativa({
  matrizComparativa,
  rankingTerritoriosPorAhorro,
  rankingUnidadesSubutilizadas,
  vehiculosExtremos,
  incidenciasPorCategoria,
}: SeccionComparativaProps) {
  return (
    <SeccionCard titulo="Matriz comparativa y rankings" descripcion="Costo, utilización y emisiones por alternativa; territorios y unidades destacadas; incidencias por categoría.">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Matriz comparativa (costo / utilización / emisiones)</p>
        <TablaSimple
          columnas={["Alternativa", "$/km", "Utilización", "gCO₂/km"]}
          filas={matrizComparativa.map((f) => [
            MEDIO_LABELS[f.alternativa],
            formatoOSinDatos(f.costoPromedioPorKm, formatoMxn),
            formatoOSinDatos(f.utilizacionPromedioPorcentaje, formatoPorcentaje),
            formatoOSinDatos(f.emisionesPromedioPorKmGramos, (v) => formatoNumero(v)),
          ])}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Ranking de territorios por ahorro</p>
          <TablaSimple columnas={["Territorio", "Ahorro"]} filas={rankingTerritoriosPorAhorro.map((f) => [f.nombre, formatoMxn(f.ahorroTotal)])} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Unidades más subutilizadas</p>
          <TablaSimple
            columnas={["Vehículo", "Territorio", "Utilización"]}
            filas={rankingUnidadesSubutilizadas.slice(0, 8).map((v) => [v.nombre, nombreTerritorio(v.territorioId), formatoPorcentaje(v.utilizacionPorcentaje)])}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Vehículos más utilizados</p>
          <TablaSimple columnas={["Vehículo", "Viajes", "Utilización"]} filas={vehiculosExtremos.masUtilizados.map((v) => [v.nombre, formatoNumero(v.viajes), formatoPorcentaje(v.utilizacionPorcentaje)])} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Vehículos menos utilizados</p>
          <TablaSimple columnas={["Vehículo", "Viajes", "Utilización"]} filas={vehiculosExtremos.menosUtilizados.map((v) => [v.nombre, formatoNumero(v.viajes), formatoPorcentaje(v.utilizacionPorcentaje)])} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Incidencias por categoría</p>
        <TablaSimple columnas={["Categoría", "Total"]} filas={incidenciasPorCategoria.map((f) => [TIPO_INCIDENCIA_LABELS[f.tipoIncidencia], formatoNumero(f.total)])} />
      </div>
    </SeccionCard>
  );
}
