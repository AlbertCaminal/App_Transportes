/**
 * Datos públicos de la app (sin secretos).
 * Las tiendas exigen URL de política de privacidad y, a menudo, soporte o contacto.
 * Rellena los TODO antes de enviar a revisión en Play Console y App Store Connect.
 */
export const publicApp = {
  /** Debe coincidir con el nombre en las tiendas */
  displayName: 'Barcelona Logistics',
  /** URL pública obligatoria para Apple y Google si recoges datos personales */
  privacyPolicyUrl: 'https://example.com/privacy' as string, // TODO
  /** Recomendado: correo de soporte visible en ficha de la tienda o dentro de la app */
  supportEmail: 'soporte@example.com' as string, // TODO
  /** Para la ficha web / marketing */
  marketingSiteUrl: 'https://example.com' as string, // TODO
} as const;
