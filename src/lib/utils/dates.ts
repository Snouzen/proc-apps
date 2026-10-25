export const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS) || 7;

export function parseYmdOrIsoToUtcNoon(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
      return null;
    }
    return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

export function getBusinessNow(offsetHours = TZ_OFFSET_HOURS): Date {
  const now = new Date();
  return new Date(now.getTime() + offsetHours * 3600 * 1000);
}

export function getBusinessStartOfToday(offsetHours = TZ_OFFSET_HOURS): Date {
  const shifted = getBusinessNow(offsetHours);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

export function getBusinessStartOfMonth(offsetHours = TZ_OFFSET_HOURS): Date {
  const shifted = getBusinessNow(offsetHours);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );
}

export function getBusinessEndOfSoon(days = 14, offsetHours = TZ_OFFSET_HOURS): Date {
  const shifted = getBusinessNow(offsetHours);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + days,
      23,
      59,
      59,
      999,
    ),
  );
}
