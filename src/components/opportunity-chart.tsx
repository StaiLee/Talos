"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function OpportunityChart({ data }: { data: { name: string; value: number }[] }) {
  return <div className="h-[230px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={105} tickLine={false} axisLine={false} tick={{ fill: "#65758a", fontSize: 11 }} />
        <Tooltip cursor={{ fill: "#f4f6f8" }} contentStyle={{ border: "1px solid #dfe5eb", borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>{data.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#c57d2a" : "#244968"} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
