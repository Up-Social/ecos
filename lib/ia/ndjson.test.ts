import { describe, expect, it } from "vitest";
import { interpretarLineaNdjson, separarLineasNdjson } from "./ndjson";

describe("separarLineasNdjson", () => {
  it("devuelve las líneas completas y guarda la incompleta como resto", () => {
    expect(separarLineasNdjson('{"a":1}\n{"b":2}\n{"c":')).toEqual({
      lineas: ['{"a":1}', '{"b":2}'],
      resto: '{"c":',
    });
  });

  it("sin salto de línea todo es resto", () => {
    expect(separarLineasNdjson('{"resumen":"x')).toEqual({ lineas: [], resto: '{"resumen":"x' });
  });

  it("recompone una línea partida entre dos chunks", () => {
    const primero = separarLineasNdjson('{"resumen":"Misión ');
    const segundo = separarLineasNdjson(primero.resto + 'activa"}\n');
    expect(segundo.lineas).toEqual(['{"resumen":"Misión activa"}']);
    expect(interpretarLineaNdjson(segundo.lineas[0])).toEqual([
      { tipo: "resumen", texto: "Misión activa" },
    ]);
  });
});

describe("interpretarLineaNdjson", () => {
  it("reconoce el resumen", () => {
    expect(interpretarLineaNdjson('  {"resumen":"Buen ritmo"}  ')).toEqual([
      { tipo: "resumen", texto: "Buen ritmo" },
    ]);
  });

  it("reconoce un insight", () => {
    const insight = {
      tipo: "vacio",
      titulo: "Reto sin innovaciones",
      descripcion: "El reto X no tiene innovaciones.",
      prioridad: "alta",
      evidencia: "0 innovaciones",
    };
    expect(interpretarLineaNdjson(JSON.stringify(insight))).toEqual([{ tipo: "insight", insight }]);
  });

  it("separa resumen e insight cuando el modelo los junta en un objeto", () => {
    // Caso real observado con gpt-6-luna.
    const insight = {
      tipo: "vacio",
      titulo: "Movilidad sin innovaciones",
      descripcion: "El reto de Movilidad no tiene innovaciones.",
      prioridad: "alta",
      evidencia: "0 innovaciones",
    };
    const linea = JSON.stringify({ resumen: "Concentración en Vivienda", ...insight });
    expect(interpretarLineaNdjson(linea)).toEqual([
      { tipo: "resumen", texto: "Concentración en Vivienda" },
      { tipo: "insight", insight },
    ]);
  });

  it.each(["", "   ", "{incompleto", "```json", "[]", "42", "null", '{"otro":"campo"}'])(
    "ignora %j",
    (linea) => {
      expect(interpretarLineaNdjson(linea)).toEqual([]);
    },
  );
});
