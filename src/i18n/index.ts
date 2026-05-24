// Lazy-loader for translations. English is always available synchronously,
// other languages are loaded on demand via dynamic import.
import en from './en.js';

const cache: Record<string, Record<string, string>> = { en };
const pendings: Record<string, Promise<Record<string, string>>> = {};

export function getTranslationsSync(lang: string): Record<string, string> {
  return cache[lang] || en;
}

export async function loadTranslations(lang: string): Promise<Record<string, string>> {
  if (cache[lang]) return cache[lang];
  if (pendings[lang]) return pendings[lang];

  const promise = import(`./${lang}.js`)
    .then((m) => {
      const t = (m.default || m) as Record<string, string>;
      cache[lang] = t;
      return t;
    })
    .catch(() => {
      // Fallback to English if language file not found
      return en;
    });

  pendings[lang] = promise;
  return promise;
}
