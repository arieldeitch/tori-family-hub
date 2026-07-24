const timeFmt = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
