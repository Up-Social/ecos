import { z } from "zod";

// -----------------------------------------------------------------------------
// Instancia de Zod compartida por todos los schemas. Activa el locale español
// para que los mensajes por defecto (tipo inválido, campo obligatorio…) salgan
// en español en formularios y APIs. Importa `z` desde aquí, no desde "zod".
// -----------------------------------------------------------------------------

z.config(z.locales.es());

export { z };
