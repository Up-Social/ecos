// =============================================================================
// Catálogo de roles del panel.
// El catálogo "fuente de verdad" vive en la tabla `roles` de la BD; aquí se
// declara la versión TypeScript que se usa para tipar y validar en código.
// =============================================================================

export type RoleKey = "superadmin" | "gestor" | "usuario";

export const ROLE_KEYS: RoleKey[] = ["superadmin", "gestor", "usuario"];

export const ROLE_LABELS: Record<RoleKey, string> = {
  superadmin: "Superadmin",
  gestor: "Gestor",
  usuario: "Usuario",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  superadmin: "Acceso total al panel",
  gestor: "Acceso al panel con permisos a definir",
  usuario: "Solo parte pública, sin acceso al panel",
};

/** Roles que tienen acceso a /dashboard. */
export const PANEL_ROLES: RoleKey[] = ["superadmin", "gestor"];

export function canAccessPanel(roles: RoleKey[]): boolean {
  return roles.some((r) => PANEL_ROLES.includes(r));
}

export function isSuperadmin(roles: RoleKey[]): boolean {
  return roles.includes("superadmin");
}

export function isGestor(roles: RoleKey[]): boolean {
  return roles.includes("gestor");
}
