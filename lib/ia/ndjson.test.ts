import { describe, expect, it } from "vitest";
import { clasificarLineaNdjson, separarLineasNdjson } from "./ndjson";

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
    expect(clasificarLineaNdjson(segundo.lineas[0])).toEqual({
      tipo: "resumen",
      texto: "Misión activa",
    });
  });
});

describe("clasificarLineaNdjson", () => {
  it("reconoce el resumen", () => {
    expect(clasificarLineaNdjson('  {"resumen":"Buen ritmo"}  ')).toEqual({
      tipo: "resumen",
      texto: "Buen ritmo",
    });
  });

  it("reconoce un insight", () => {
    const insight = {
      tipo: "vacio",
      titulo: "Reto sin innovaciones",
      descripcion: "El reto X no tiene innovaciones.",
      prioridad: "alta",
      evidencia: "0 innovaciones",
    };
    expect(clasificarLineaNdjson(JSON.stringify(insight))).toEqual({ tipo: "insight", insight });
  });

  it.each(["", "   ", "{incompleto", "```json", "[]", "42", '{"otro":"campo"}'])(
    "ignora %j",
    (linea) => {
      expect(clasificarLineaNdjson(linea)).toBeNull();
    },
  );
});
