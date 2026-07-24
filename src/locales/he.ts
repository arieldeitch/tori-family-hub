// Hebrew user-facing strings. Business logic must not embed Hebrew directly;
// import keys from here (or from t()).
export const he = {
  app: {
    name: "Tori",
    tagline: "מרכז התפעול המשפחתי",
  },
  home: {
    title: "ברוכים הבאים ל‑Tori",
    subtitle: "התשתית פועלת. עברית ו‑RTL מופעלים.",
    healthy: "האפליקציה עובדת",
  },
  common: {
    loading: "טוען…",
    error: "אירעה שגיאה",
    retry: "נסו שוב",
  },
} as const;

export type Locale = "he";
export type Dictionary = typeof he;
