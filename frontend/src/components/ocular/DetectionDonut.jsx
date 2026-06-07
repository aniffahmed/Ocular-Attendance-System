import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const DEFAULT_SEGMENTS = [
  { name: "Recognized (auto)", value: 68, color: "#3b82f6" },
  { name: "Manually verified", value: 18, color: "#22c55e" },
  { name: "Flagged / unknown", value: 9, color: "#eab308" },
  { name: "Absent", value: 5, color: "#ef4444" },
];

export function DetectionDonut({ data = DEFAULT_SEGMENTS }) {
  return (
    <div className="h-[320px] w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">AI detection summary</h3>
      <p className="mb-2 text-xs text-slate-500">Illustrative split — wire to audit logs when available.</p>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="42%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="rgba(15,23,42,0.5)" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: "11px", paddingLeft: "8px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
