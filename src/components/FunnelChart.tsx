"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { STAGE_LABEL } from "@/types";

export default function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" horizontal={false} />
        <XAxis type="number" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#6B6558" }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="stage"
          type="category"
          tickFormatter={(s) => STAGE_LABEL[s as keyof typeof STAGE_LABEL]}
          tick={{ fontFamily: "Inter", fontSize: 12, fill: "#1B1A17" }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E4E0D6" }} formatter={(v) => [v, "reached"]} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#2F3B6B" fillOpacity={1 - i * 0.18} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
