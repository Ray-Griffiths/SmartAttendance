import React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

interface UserRoleChartProps {
  lecturers: number;
  students: number;
  admins: number;
}

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6"]; // blue, green, purple

const UserRoleChart: React.FC<UserRoleChartProps> = ({ lecturers, students, admins }) => {
  const data = [
    { name: "Lecturers", value: lecturers },
    { name: "Students", value: students },
    { name: "Admins", value: admins },
  ];

  return (
    <div className="w-full h-60 p-4 border rounded">
      <h3 className="text-gray-700 font-medium mb-2">User Role Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={60}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserRoleChart;
