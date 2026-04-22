import { es } from '../locales/es';
import { ca } from '../locales/ca';
import { en } from '../locales/en';

type AnyRecord = { [k: string]: unknown };

function collectKeys(obj: AnyRecord, prefix = ''): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj)) {
    const value = (obj as AnyRecord)[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...collectKeys(value as AnyRecord, path));
    } else {
      out.push(path);
    }
  }
  return out.sort();
}

describe('i18n locales', () => {
  const esKeys = collectKeys(es as unknown as AnyRecord);

  it('ca tiene exactamente las mismas claves que es', () => {
    expect(collectKeys(ca as unknown as AnyRecord)).toEqual(esKeys);
  });

  it('en tiene exactamente las mismas claves que es', () => {
    expect(collectKeys(en as unknown as AnyRecord)).toEqual(esKeys);
  });

  it('no hay valores vacíos en ninguna locale', () => {
    for (const locale of [es, ca, en]) {
      const entries = collectKeys(locale as unknown as AnyRecord).map((path) => {
        const value = path.split('.').reduce<unknown>((acc, k) => (acc as AnyRecord)[k], locale);
        return [path, value] as const;
      });
      for (const [path, value] of entries) {
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
        // referencia explícita a `path` para mensajes de error útiles
        if (!value) throw new Error(`Clave vacía: ${path}`);
      }
    }
  });
});
