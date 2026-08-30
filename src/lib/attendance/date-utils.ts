import { format, parseISO, startOfDay } from "date-fns";

export function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDateKey(key: string): Date {
  return startOfDay(parseISO(key));
}
