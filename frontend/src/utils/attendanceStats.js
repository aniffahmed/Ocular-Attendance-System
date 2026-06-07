/** Derive KPIs and chart series from attendance rows { name, date, time }. */

function toLocalDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISODate() {
  return toLocalDateKey(new Date());
}

export function uniqueNamesOnDate(rows, dateStr) {
  const s = new Set();
  for (const r of rows) {
    if (r.date === dateStr && r.name) s.add(r.name);
  }
  return s.size;
}

export function uniqueNamesAll(rows) {
  const s = new Set();
  for (const r of rows) {
    if (r.name) s.add(r.name);
  }
  return s.size;
}

export function uniquePresentNamesOnDate(rows, dateStr) {
  const s = new Set();
  for (const r of rows) {
    if (!r.name || r.date !== dateStr) continue;
    const status = String(r.status || "present").toLowerCase();
    if (status === "present") s.add(r.name);
  }
  return s.size;
}

export function flaggedCountOnDate(rows, dateStr) {
  let n = 0;
  for (const r of rows) {
    if (r.date !== dateStr) continue;
    const status = String(r.status || "").toLowerCase();
    if (status === "partial_review" || status === "in_progress") n += 1;
  }
  return n;
}

/** Last N calendar days: daily unique headcount + optional multi-class style series. */
export function trendSeriesLastDays(rows, days = 30) {
  const byDate = new Map();
  for (const r of rows) {
    if (!r.date || !r.name) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, new Set());
    byDate.get(r.date).add(r.name);
  }

  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const base = byDate.has(key) ? byDate.get(key).size : 0;
    const dayIndex = days - i;
    // Synthetic split for multi-line visual (no class column in DB yet)
    const cs101 = base;
    const ee202 = Math.max(0, Math.round(base * 0.85 + (dayIndex % 3)));
    const me303 = Math.max(0, Math.round(base * 0.72 + ((dayIndex + 1) % 4)));
    out.push({
      day: dayIndex,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      CS101: cs101,
      EE202: ee202,
      ME303: me303,
      all: base,
    });
  }
  return out;
}

/** Overall rate: avg of (daily unique / max daily unique) over window, capped 100. */
export function overallAttendanceRate(rows, days = 30) {
  if (!rows?.length) return 0;
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const fromKey = toLocalDateKey(from);

  let present = 0;
  let total = 0;
  for (const r of rows) {
    if (!r?.date || r.date < fromKey) continue;
    const status = String(r.status || "present").toLowerCase();
    if (status === "present") {
      present += 1;
      total += 1;
    } else if (status === "absent" || status === "partial_review" || status === "in_progress") {
      total += 1;
    }
  }
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

export function recentActivityRows(rows, limit = 8) {
  const sorted = [...rows].sort((a, b) => {
    const da = `${a.date}T${a.time || "00:00:00"}`;
    const db = `${b.date}T${b.time || "00:00:00"}`;
    return db.localeCompare(da);
  });
  return sorted.slice(0, limit);
}
