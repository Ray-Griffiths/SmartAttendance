import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AttendanceData {
  day: string;
  rate: number;
}

interface AttendanceChartProps {
  data?: AttendanceData[] | null;
  loading?: boolean;
  title?: string;
}

export default function AttendanceChart({
  data = null,
  loading = false,
  title = "Weekly Attendance Trend",
}: AttendanceChartProps): JSX.Element {
  if (loading) {
    return (
      <Card className="h-64 flex items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="text-gray-500 text-sm">Loading chart…</div>
      </Card>
    );
  }

  if (!data || !data.length) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <div
          className="text-gray-500 text-sm text-center"
          role="img"
          aria-label="Attendance chart not available"
        >
          No attendance trend data available.
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            role="img"
            aria-label="Weekly attendance rate trend"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#1d4ed8", strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
