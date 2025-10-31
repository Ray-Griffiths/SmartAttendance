import React from 'react';

interface ChartDataPoint {
  day: string;
  rate: number;
}

interface AttendanceChartProps {
  data?: ChartDataPoint[];
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No attendance data available
      </div>
    );
  }

  const maxRate = Math.max(...data.map(d => d.rate));
  const chartHeight = 200;
  const barWidth = 40;
  const gap = 20;
  const chartWidth = (barWidth + gap) * data.length - gap;

  return (
    <div className="relative h-64 w-full" role="img" aria-label="Attendance trend chart">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1="0"
              y1={chartHeight - (tick / 100) * chartHeight}
              x2={chartWidth}
              y2={chartHeight - (tick / 100) * chartHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const height = (d.rate / 100) * chartHeight;
            const x = i * (barWidth + gap);
            return (
              <g key={d.day}>
                <rect
                  x={x}
                  y={chartHeight - height}
                  width={barWidth}
                  height={height}
                  rx="4"
                  fill="#3b82f6"
                  opacity="0.9"
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend for screen readers */}
      <div className="sr-only">
        {data.map((d) => (
          <p key={d.day}>
            {d.day}: {d.rate}% attendance
          </p>
        ))}
      </div>
    </div>
  );
};