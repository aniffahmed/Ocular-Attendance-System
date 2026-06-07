import { MasterAttendanceLedger } from "./ledger/MasterAttendanceLedger.jsx";

const WEEKDAYS = [
	{ value: 0, label: "Monday" },
	{ value: 1, label: "Tuesday" },
	{ value: 2, label: "Wednesday" },
	{ value: 3, label: "Thursday" },
	{ value: 4, label: "Friday" },
	{ value: 5, label: "Saturday" },
];

export function ClassManagementPage({
	authFetch,
	departments,
	sections,
	blocks,
	selectedSectionId,
	setSelectedSectionId,
	newSection,
	setNewSection,
	createSection,
	timetableDraft,
	setTimetableDraft,
	saveTimetable,
	classMsg,
}) {
	const periodBlocks = blocks.filter((b) => b.block_type === "period");

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
				<h2 className="text-lg font-semibold text-white">Department &amp; class management</h2>
				<p className="mt-1 text-sm text-slate-400">
					Configure sections under CSE, IT, ECE, EEE, MECH, CE, AI&amp;DS, MCA, MBA.
				</p>

				<form onSubmit={createSection} className="mt-4 grid gap-3 md:grid-cols-4">
					<select
						value={newSection.department_code}
						onChange={(e) => setNewSection({ ...newSection, department_code: e.target.value })}
						className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
						required
					>
						<option value="">Department</option>
						{departments.map((d) => (
							<option key={d.code} value={d.code}>
								{d.code}
							</option>
						))}
					</select>
					<input
						type="number"
						value={newSection.batch_year}
						onChange={(e) => setNewSection({ ...newSection, batch_year: e.target.value })}
						className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
						placeholder="Batch year"
						required
					/>
					<input
						value={newSection.section_name}
						onChange={(e) => setNewSection({ ...newSection, section_name: e.target.value.toUpperCase() })}
						className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
						placeholder="Section"
						required
					/>
					<button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
						Add section
					</button>
				</form>
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 xl:col-span-1">
					<h3 className="text-sm font-semibold text-white">Class sections</h3>
					<div className="mt-3 max-h-80 space-y-2 overflow-auto">
						{sections.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => setSelectedSectionId(String(s.id))}
								className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
									String(selectedSectionId) === String(s.id)
										? "border-sky-400 bg-sky-500/10 text-sky-100"
										: "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800"
								}`}
							>
								<p className="font-medium">{s.class_label}</p>
								<p className="mt-0.5 text-xs text-slate-400">Roster: {s.roster_count}</p>
							</button>
						))}
						{!sections.length && <p className="text-sm text-slate-500">No sections yet.</p>}
					</div>
				</div>

				<div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 xl:col-span-2">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-sm font-semibold text-white">Daily timetable (Periods 1-8)</h3>
						<button
							type="button"
							onClick={saveTimetable}
							disabled={!selectedSectionId}
							className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
						>
							Save timetable
						</button>
					</div>

					{!selectedSectionId ? (
						<p className="mt-4 text-sm text-slate-500">Select a section to edit timetable.</p>
					) : (
						<div className="mt-4 overflow-auto rounded-lg border border-slate-700">
							<table className="min-w-full text-left text-xs text-slate-200">
								<thead className="sticky top-0 bg-slate-800 text-slate-300">
									<tr>
										<th className="px-3 py-2">Period</th>
										{WEEKDAYS.map((w) => (
											<th key={w.value} className="px-3 py-2">
												{w.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{periodBlocks.map((p) => (
										<tr key={p.period_number} className="border-t border-slate-800">
											<td className="whitespace-nowrap px-3 py-2 text-slate-300">
												{p.label} ({p.start_time}-{p.end_time})
											</td>
											{WEEKDAYS.map((w) => {
												const key = `${w.value}-${p.period_number}`;
												return (
													<td key={key} className="px-2 py-1.5">
														<input
															value={timetableDraft[key] || ""}
															onChange={(e) => setTimetableDraft({ ...timetableDraft, [key]: e.target.value })}
															className="w-36 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
															placeholder="Subject"
														/>
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{classMsg && <p className="mt-3 text-sm text-amber-200">{classMsg}</p>}
				</div>
			</div>

			<MasterAttendanceLedger authFetch={authFetch} departments={departments} />
		</div>
	);
}
