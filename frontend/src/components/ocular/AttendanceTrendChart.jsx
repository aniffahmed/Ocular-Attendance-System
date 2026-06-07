import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AttendanceTrendChart({ data }) {
  return (
    <div className="h-[320px] w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        Attendance trends — last 30 days
      </h3>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
          <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Line type="monotone" dataKey="CS101" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="EE202" stroke="#14b8a6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ME303" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
