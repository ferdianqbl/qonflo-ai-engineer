const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Formats an ISO timestamp as "2025-01-01 10:00:00" in the viewer's local time zone.
 * Seconds are kept so that two changes made within the same minute stay distinguishable.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day} ${time}`;
}
