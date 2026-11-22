/**
 * Dates picked from a date field (a due date, an install date) are stored as
 * midnight UTC of that day. Shown with toLocaleDateString() they came out one
 * day early everywhere west of Greenwich -- a job due the 22nd read "11/21" --
 * and compared with the current instant they went "overdue" at 6 pm Central
 * the evening before. These helpers keep a picked day as that day.
 */

/** "YYYY-MM-DD" of a stored date-only value. */
export function dayKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** A stored date-only value, written the way the reader's locale writes dates. */
export function formatDay(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(value).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today as "YYYY-MM-DD" on the clock of whoever is looking (browser). */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True once the picked day is over: the day AFTER it, not during it. */
export function isPastDay(value: string | Date, now: Date = new Date()): boolean {
  return dayKey(value) < localToday(now);
}

/**
 * The value a <input type="datetime-local"> needs to show the current local
 * time. toISOString() is UTC, so using it there pre-filled the field six hours
 * ahead in Central: downtime logged "now" started in the future and could not
 * be ended, because an end before the start is refused.
 */
export function localDateTimeInput(now: Date = new Date()): string {
  return `${localToday(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Server side: midnight UTC of "today" in the app's timezone (APP_TIMEZONE,
 * default US Central). A date-only value before this is a day that has ended.
 */
export function startOfAppToday(now: Date = new Date(), timeZone?: string): Date {
  const zone = timeZone || process.env.APP_TIMEZONE || "America/Chicago";
  let key: string;
  try {
    key = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
  return new Date(`${key}T00:00:00.000Z`);
}
