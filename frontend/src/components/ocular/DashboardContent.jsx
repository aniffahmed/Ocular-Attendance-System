import { AttendanceTrendChart } from "./AttendanceTrendChart.jsx";
import { DetectionDonut } from "./DetectionDonut.jsx";
import { KpiRow } from "./KpiRow.jsx";
import { QuickActions } from "./QuickActions.jsx";
import { RecentActivityFeed } from "./RecentActivityFeed.jsx";
import { SmartSearchPanel } from "./SmartSearchPanel.jsx";
import {
  flaggedCountOnDate,
  overallAttendanceRate,
  recentActivityRows,
  todayISODate,
  trendSeriesLastDays,
  uniqueNamesAll,
  uniquePresentNamesOnDate,
} from "../../utils/attendanceStats.js";

export function DashboardContent({
  attendance,
  reviewQueue,
  loading,
  loadAttendance,
  staffLike,
  mlStatus,
  adminUsers,
  question,
  setQuestion,
  handleAsk,
  chatLoading,
  chatError,
  chatResult,
  postMl,
  setPage,
}) {
  const today = todayISODate();
  const presentToday = uniquePresentNamesOnDate(attendance, today);
  const studentRoster = (adminUsers || []).filter((u) => String(u.role || "").toLowerCase() === "student").length;
  const roster = Math.max(studentRoster || uniqueNamesAll(attendance), 1);
  const overall = overallAttendanceRate(attendance, 30);
  const trend = trendSeriesLastDays(attendance, 30);
  const activity = recentActivityRows(attendance, 10);
  const sessionRunning = mlStatus?.session_running;
  const flagged = flaggedCountOnDate(attendance, today);

  return (
    <div className="space-y-6">
      {staffLike && (
        <SmartSearchPanel
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleAsk}
          chatLoading={chatLoading}
          chatError={chatError}
          chatResult={chatResult}
        />
      )}

      <KpiRow
        liveActive={!!sessionRunning}
        presentFraction={`${presentToday}/${roster}`}
        overallRate={overall}
        reviewQueue={reviewQueue?.length || 0}
        flagged={flagged}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AttendanceTrendChart data={trend} />
        </div>
        <div>
          <DetectionDonut />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance log</h3>
              <button
                type="button"
                onClick={loadAttendance}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {loading ? (
                <p className="p-4 text-sm text-slate-500">Loading…</p>
              ) : attendance.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No rows yet.</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.slice(0, 50).map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.id}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          {String(row.name || "").replaceAll("_", " ")}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.date}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <RecentActivityFeed rows={activity} />
          {staffLike && (
            <QuickActions
              onStartLive={() => postMl("/api/start_session")}
              onReport={() => setPage("analytics")}
              onRegister={() => setPage("live")}
              onReview={() => setPage("records")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
