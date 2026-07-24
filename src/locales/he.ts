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
    startOnboarding: "התחל הקמה",
    goHousehold: "בני הבית",
    goChild: "תצוגת ילד",
  },
  roles: {
    owner: "מנהל/ת הבית",
    adult: "מבוגר",
    child: "ילד",
    guest: "אורח/מטפל",
  },
  status: {
    active: "פעיל",
    invited: "הוזמן",
    limited: "גישה מוגבלת",
  },
  onboarding: {
    step: "שלב",
    of: "מתוך",
    next: "המשך",
    back: "חזרה",
    skip: "דילוג",
    finish: "סיום והמשך למסך היום",
    welcome: {
      title: "ברוכים הבאים ל‑Tori",
      body: "עוזר תפעולי רגוע לניהול היום‑יום של המשפחה. נלווה אותך בהקמה קצרה.",
      cta: "בואו נתחיל",
    },
    householdName: {
      title: "איך נקרא לבית שלכם?",
      placeholder: "למשל: בית לוי",
    },
    tzLocale: {
      title: "אזור זמן ושפה",
      timezone: "אזור זמן",
      locale: "שפה ואזור",
    },
    owner: {
      title: "הפרופיל שלך",
      subtitle: "את/ה תוגדר/י כמנהל/ת הבית.",
      namePlaceholder: "השם שלך",
    },
    members: {
      title: "מי עוד בבית?",
      subtitle: "אפשר לדלג ולהוסיף מאוחר יותר.",
      addAdult: "הוספת מבוגר",
      addChild: "הוספת ילד",
      addGuest: "הוספת אורח או מטפל",
      empty: "עדיין לא נוספו בני בית.",
    },
    summary: {
      title: "הכל מוכן",
      subtitle: "אפשר תמיד לערוך את הפרטים במסך בני הבית.",
    },
  },
  household: {
    title: "בני הבית",
    subtitle: "ניהול בני המשפחה, אורחים ומטפלים.",
    empty: "אין בני בית עדיין. הוסיפו את הראשון.",
    hasLogin: "עם התחברות",
    noLogin: "ללא התחברות",
    remove: "הסר",
    confirmRemoveTitle: "להסיר את בן/בת הבית?",
    confirmRemoveBody: "אפשר יהיה להוסיף שוב מאוחר יותר. פעולה זו לא משפיעה על היסטוריה.",
    demoBadge: "נתוני הדגמה",
    seedDemo: "טען משפחה לדוגמה",
    resetDemo: "אפס נתוני הדגמה",
    permissionsNote:
      "הסתרת פעולות כאן היא הבחנת UX בלבד. אכיפת הרשאות אמיתית תבוצע בשרת וב‑RLS בעתיד.",
  },
  memberForm: {
    name: "שם",
    role: "תפקיד",
    birthDate: "תאריך לידה (אופציונלי)",
    pinCapability: "אפשר PIN בעתיד",
    pinNote: "אפשרות עתידית. לא נשמר PIN בפועל כרגע.",
    accessWindow: "תקופת גישה",
    restrictChildren: "הגבלה לילדים ספציפיים",
    from: "מתאריך",
    to: "עד תאריך",
    prototypeOnly: "הגדרות אלה הן דמו בלבד. אכיפה תתבצע בשרת בעתיד.",
    save: "שמור",
    cancel: "ביטול",
  },
  child: {
    title: "המשימות שלי היום",
    empty: "אין כרגע משימות. אפשר לנוח.",
    done: "בוצע",
    help: "צריך עזרה",
    swap: "רוצה להחליף",
    sentForApproval: "נשלח לאישור",
    switchToAdult: "מעבר לתצוגת מבוגר",
    hello: "היי",
  },
  common: {
    loading: "טוען…",
    error: "אירעה שגיאה",
    retry: "נסו שוב",
    close: "סגור",
    add: "הוסף",
  },
} as const;

export type Locale = "he";
export type Dictionary = typeof he;
