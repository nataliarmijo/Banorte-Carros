"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOR_GRIS_SECUNDARIO } from "../_lib/colores";

const EJE_ESTILO = { fontSize: 12, fill: "#52514e" };
const GRID_COLOR = "#e1e0d9";

export interface SerieConfig {
  key: string;
  etiqueta: string;
  color: string;
}

interface GraficoLineaMensualProps {
  datos: Array<{ anioMes: string; etiqueta: string; [key: string]: string | number | null }>;
  series: SerieConfig[];
  formatoValor: (v: number) => string;
  alto?: number;
}

/** Línea mensual multi-serie (evolución 12 meses). Un solo eje Y; leyenda siempre presente para ≥2 series. */
export function GraficoLineaMensual({ datos, series, formatoValor, alto = 260 }: GraficoLineaMensualProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <LineChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etiqueta" tick={EJE_ESTILO} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis tick={EJE_ESTILO} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatoValor(Number(v))} />
        <Tooltip
          formatter={(value: unknown) => (typeof value === "number" ? formatoValor(value) : "Sin datos suficientes")}
          contentStyle={{ borderRadius: 8, borderColor: GRID_COLOR, fontSize: 12 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.etiqueta} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface GraficoAreaMensualProps {
  datos: Array<{ anioMes: string; etiqueta: string; [key: string]: string | number | null }>;
  series: SerieConfig[];
  formatoValor: (v: number) => string;
  alto?: number;
}

/** Área apilada mensual (composición Pool/Asignado). */
export function GraficoAreaMensual({ datos, series, formatoValor, alto = 260 }: GraficoAreaMensualProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <AreaChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etiqueta" tick={EJE_ESTILO} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis tick={EJE_ESTILO} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => formatoValor(Number(v))} />
        <Tooltip
          formatter={(value: unknown) => (typeof value === "number" ? formatoValor(value) : "Sin datos suficientes")}
          contentStyle={{ borderRadius: 8, borderColor: GRID_COLOR, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.etiqueta} stroke={s.color} fill={s.color} fillOpacity={0.18} strokeWidth={2} stackId="composicion" />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface GraficoBarrasProps {
  datos: Array<{ etiqueta: string; valor: number | null; color?: string }>;
  formatoValor: (v: number) => string;
  alto?: number;
  colorPorDefecto?: string;
}

/** Barras de una sola serie para comparar entre 3-8 categorías (alternativas, territorios, tipos de vehículo). */
export function GraficoBarras({ datos, formatoValor, alto = 240, colorPorDefecto = COLOR_GRIS_SECUNDARIO }: GraficoBarrasProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etiqueta" tick={EJE_ESTILO} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis tick={EJE_ESTILO} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatoValor(Number(v))} />
        <Tooltip
          formatter={(value: unknown) => (typeof value === "number" ? formatoValor(value) : "Sin datos suficientes")}
          contentStyle={{ borderRadius: 8, borderColor: GRID_COLOR, fontSize: 12 }}
        />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {datos.map((d, i) => (
            <Cell key={d.etiqueta || i} fill={d.color ?? colorPorDefecto} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GraficoBarrasAgrupadasProps {
  datos: Array<{ etiqueta: string; [key: string]: string | number }>;
  series: SerieConfig[];
  formatoValor: (v: number) => string;
  alto?: number;
}

/** Barras agrupadas (no apiladas) para comparar 2-3 series por categoría (p. ej. Pool vs. Asignado por territorio). */
export function GraficoBarrasAgrupadas({ datos, series, formatoValor, alto = 260 }: GraficoBarrasAgrupadasProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etiqueta" tick={EJE_ESTILO} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis tick={EJE_ESTILO} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatoValor(Number(v))} />
        <Tooltip
          formatter={(value: unknown) => (typeof value === "number" ? formatoValor(value) : "Sin datos suficientes")}
          contentStyle={{ borderRadius: 8, borderColor: GRID_COLOR, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.etiqueta} fill={s.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
