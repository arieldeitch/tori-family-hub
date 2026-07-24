import { he, type Dictionary, type Locale } from "@/locales/he";

const dictionaries: Record<Locale, Dictionary> = { he };

export const currentLocale: Locale = "he";
export const direction: "rtl" | "ltr" = "rtl";

type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${P}${P extends "" ? "" : "."}${K}`>
    : `${P}${P extends "" ? "" : "."}${K}`;
}[keyof T & string];

export type TranslationKey = Path<Dictionary>;

export function t(key: TranslationKey): string {
  const parts = key.split(".");
  let value: unknown = dictionaries[currentLocale];
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof value === "string" ? value : key;
}
