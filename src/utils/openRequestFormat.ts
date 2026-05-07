/** Línea legible de ruta para una fila de `requests` (cliente o suscripción transportista). */
export function formatShippingRequestRouteLine(d: Record<string, unknown>): string {
  const st = d['serviceType'];
  if (st === 'express') {
    const o = String(d['origin'] ?? '').trim();
    const dest = String(d['expressDestination'] ?? '').trim();
    if (o && dest) return `${o} → ${dest}`;
    if (o) return o;
    if (dest) return dest;
    return '—';
  }
  const pkgs = d['packages'] as { destination?: string }[] | undefined;
  if (pkgs?.length) {
    const first = String(pkgs[0].destination ?? '').trim();
    return first || '—';
  }
  return String(d['origin'] ?? '—') || '—';
}

/** Paradas para el mapa mock (marcadores / trazado); máx. 3 como en `MapMockup`. */
export function getShippingRequestMapDestinations(d: Record<string, unknown>): string[] {
  const st = d['serviceType'];
  if (st === 'express') {
    const dest = String(d['expressDestination'] ?? '').trim();
    return dest ? [dest] : [];
  }
  const pkgs = d['packages'] as { destination?: string }[] | undefined;
  if (!pkgs?.length) return [];
  return pkgs
    .map((p) => String(p.destination ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
}
