import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { InnovationPortfolio } from "@/components/dashboard/InnovationPortfolio";
import { RetosCoverage } from "@/components/dashboard/RetosCoverage";
import { AggregatedFindings } from "@/components/dashboard/AggregatedFindings";
import { SystemGaps } from "@/components/dashboard/SystemGaps";
import { StrategicRecommendations } from "@/components/dashboard/StrategicRecommendations";
import { AIInsights } from "@/components/dashboard/AIInsights";

// =============================================================================
// /dashboard
//
// Composición narrativa del panel ECOS, agrupada en 4 secciones que siguen
// la cadena del modelo:
//
//   01 · Indicadores       → cuánto hay
//   02 · Estructura        → cómo se distribuye
//   03 · Conocimiento      → qué hemos aprendido / qué falta
//   04 · Transferencia     → qué recomendamos
//
// El selector global de misión vive en el Topbar (componente compartido).
// Todos los bloques reaccionan automáticamente al cambio de misión vía el
// MissionContext. Cada bloque es un client component independiente con su
// propio fetch + loading state.
// =============================================================================

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <DashboardHeader />

      {/* ----------------------------------------------------------------- */}
      {/* 00 · Insights generados por IA                                     */}
      {/* ----------------------------------------------------------------- */}
      <DashboardSection
        eyebrow="00 · Análisis IA"
        title="Insights estratégicos"
        description="Lectura asistida por IA del estado de la misión seleccionada."
      >
        <AIInsights />
      </DashboardSection>

      {/* ----------------------------------------------------------------- */}
      {/* 01 · Indicadores estratégicos                                      */}
      {/* ----------------------------------------------------------------- */}
      <DashboardSection
        eyebrow="01 · Indicadores"
        title="Estado del ecosistema"
        description="Conteos clave por capa del modelo ECOS."
      >
        <KPIGrid />
      </DashboardSection>

      {/* ----------------------------------------------------------------- */}
      {/* 02 · Estructura del portafolio                                     */}
      {/* ----------------------------------------------------------------- */}
      <DashboardSection
        eyebrow="02 · Estructura"
        title="Cartera y cobertura"
        description="Distribución de innovaciones por fase y cobertura de los retos."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InnovationPortfolio />
          <RetosCoverage />
        </div>
      </DashboardSection>

      {/* ----------------------------------------------------------------- */}
      {/* 03 · Conocimiento generado + huecos                                */}
      {/* ----------------------------------------------------------------- */}
      <DashboardSection
        eyebrow="03 · Conocimiento"
        title="Hallazgos y vacíos"
        description="Evidencias agregadas por reto e insights sobre áreas con baja actividad."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AggregatedFindings />
          <SystemGaps />
        </div>
      </DashboardSection>

      {/* ----------------------------------------------------------------- */}
      {/* 04 · Transferencia                                                 */}
      {/* ----------------------------------------------------------------- */}
      <DashboardSection
        eyebrow="04 · Transferencia"
        title="Recomendaciones estratégicas"
        description="Propuestas derivadas de los hallazgos del ecosistema."
      >
        <StrategicRecommendations />
      </DashboardSection>
    </div>
  );
}
