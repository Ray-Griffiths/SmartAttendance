import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface CourseAnalyticsChartProps {
  courses: { name: string; lecturer?: string }[];
}

const COLORS = ["#16a34a", "#dc2626"]; // Green for assigned, red for unassigned
const HOVER_COLORS = ["#22c55e", "#f87171"]; // Slightly brighter on hover

export default function CourseAnalyticsChart({ courses }: CourseAnalyticsChartProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const assignedCount = courses.filter((c) => c.lecturer && c.lecturer !== "Unassigned").length;
  const unassignedCount = courses.length - assignedCount;

  const data = [
    { name: "Assigned", value: assignedCount },
    { name: "Unassigned", value: unassignedCount },
  ];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (!courses.length) {
    return (
      <div className="shadow-sm bg-white dark:bg-gray-900 rounded p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No course data available for chart.</p>
      </div>
    );
  }

  return (
    <div className="shadow-md bg-white dark:bg-gray-900 rounded-lg p-5 transition-all duration-300 hover:shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 text-center">
        Course Lecturer Distribution
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={4}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            isAnimationActive
            animationDuration={800}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={activeIndex === index ? HOVER_COLORS[index] : COLORS[index]}
                cursor="pointer"
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} courses`, name]}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              fontSize: "0.875rem",
            }}
          />
          <Legend verticalAlign="bottom" align="center" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
        {assignedCount} assigned / {unassignedCount} unassigned lecturers
      </p>
    </div>
  );
}
