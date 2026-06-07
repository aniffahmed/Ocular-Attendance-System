import { Download, Filter } from "lucide-react";

function pct(part, total) {
	if (!total) return 0;
	return Math.round((part / total) * 1000) / 10;
}

export function AnalyticsReportsPage({ attendance }) {
	const total = attendance.length;
	const present = attendance.filter((r) => r.status === "present").length;
	const partial = attendance.filter((r) => r.status === "partial_review").length;
	const absent = attendance.filter((r) => r.status === "absent").length;

	const byDepartment = new Map();
	for (const row of attendance) {
		const key = row.department_code || "UNASSIGNED";
		byDepartment.set(key, (byDepartment.get(key) || 0) + 1);
	}

	const depRows = [...byDepartment.entries()]
		.map(([department, count]) => ({ department, count, rate: pct(count, total) }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 8);

	const periodMap = new Map();
	for (const row of attendance) {
		const p = Number(row.period_number || 0);
		if (p < 1 || p > 8) continue;
		const k = `P${p}`;
		periodMap.set(k, (periodMap.get(k) || 0) + 1);
	}
	const periodRows = Array.from({ length: 8 }, (_, i) => {
		const k = `P${i + 1}`;
		return { period: k, count: periodMap.get(k) || 0 };
	});
	const maxPeriodCount = Math.max(1, ...periodRows.map((r) => r.count));

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold text-white">Analytics Reports</h2>
						<p className="mt-1 text-sm text-slate-300">Summary of attendance quality, departments, and period activity.</p>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
						>
							<Filter className="h-4 w-4" />
							Last 30 Days
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
						>
							<Download className="h-4 w-4" />
							Export View
						</button>
					</div>
				</div>

				<div className="mt-5 grid gap-3 md:grid-cols-4">
					<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
						<p className="text-xs text-slate-400">Total Sessions</p>
						<p className="mt-1 text-2xl font-semibold text-white">{total}</p>
					</div>
					<div className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 p-4">
						<p className="text-xs text-emerald-200/80">Present</p>
						<p className="mt-1 text-2xl font-semibold text-emerald-200">{pct(present, total)}%</p>
					</div>
					<div className="rounded-xl border border-amber-700/60 bg-amber-900/20 p-4">
						<p className="text-xs text-amber-200/80">Partial Review</p>
						<p className="mt-1 text-2xl font-semibold text-amber-200">{pct(partial, total)}%</p>
					</div>
					<div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-4">
						<p className="text-xs text-rose-200/80">Absent</p>
						<p className="mt-1 text-2xl font-semibold text-rose-200">{pct(absent, total)}%</p>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
					<h3 className="mb-4 text-sm font-semibold text-slate-100">Top Departments by Session Count</h3>
					{depRows.length === 0 ? (
						<p className="text-sm text-slate-400">No department-linked rows yet.</p>
					) : (
						<div className="space-y-2">
							{depRows.map((row) => (
								<div key={row.department} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium text-slate-100">{row.department}</span>
										<span className="text-slate-300">{row.count} ({row.rate}%)</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
					<h3 className="mb-4 text-sm font-semibold text-slate-100">Period Engagement (P1-P8)</h3>
					<div className="space-y-2">
						{periodRows.map((row) => (
							<div key={row.period}>
								<div className="mb-1 flex items-center justify-between text-xs text-slate-300">
									<span>{row.period}</span>
									<span>{row.count}</span>
								</div>
								<div className="h-2 rounded bg-slate-800">
									<div
										className="h-2 rounded bg-cyan-500"
										style={{ width: `${Math.max(4, (row.count / maxPeriodCount) * 100)}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
