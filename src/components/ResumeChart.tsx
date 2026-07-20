"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ResumeStats } from "@/types";

export default function ResumeChart({ data }: { data: ResumeStats[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" vertical={false} />
        <XAxis dataKey="resumeVersion" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#6B6558" }} axisLine={{ stroke: "#E4E0D6" }} tickLine={false} />
        <YAxis tick={{ fontFamily: "Inter", fontSize: 11, fill: "#6B6558" }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E4E0D6" }} />
        <Bar dataKey="conversion" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#2F3B6B" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
