import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatsCard } from "./common/StatsCard";
import AttendanceChart from "./common/AttendanceChart";
import { Loader2, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { getCourses, getAttendanceSummary, Course, AttendanceSummary } from "@/services/adminApi";

interface AttendanceStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  trendData: Array<{ day: string; rate: number }>;
  lastWeekRate?: number;
  courseAttendance: Array<{ courseId: string; studentsPresent: number; studentsAbsent: number }>;
}

export default function AttendanceOverview(): JSX.Element {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const coursesData = await getCourses(); // fetch all courses
        setCourses(coursesData);

        // Fetch attendance summary from backend
        const attendanceSummary: AttendanceSummary[] = await getAttendanceSummary();

        const courseAttendance = coursesData.map((course) => {
          const summary = attendanceSummary.find((s) => s.courseId === course.id);
          return {
            courseId: course.id, // string to match API
            studentsPresent: summary?.studentsPresent ?? 0,
            studentsAbsent: summary?.studentsAbsent ?? 0,
          };
        });

        const totalStudents = courseAttendance.reduce(
          (sum, c) => sum + c.studentsPresent + c.studentsAbsent,
          0
        );
        const presentToday = courseAttendance.reduce((sum, c) => sum + c.studentsPresent, 0);
        const absentToday = courseAttendance.reduce((sum, c) => sum + c.studentsAbsent, 0);
        const attendanceRate = totalStudents ? Math.round((presentToday / totalStudents) * 100) : 0;

        // Optionally, fetch trend data from API (here using course titles as placeholder)
        const trendData = attendanceSummary.map((s) => ({
          day: s.courseTitle,
          rate: s.attendanceRate ?? 0,
        }));

        const lastWeekRate = trendData.length
          ? trendData[trendData.length - 1].rate
          : attendanceRate;

        setStats({
          totalStudents,
          presentToday,
          absentToday,
          attendanceRate,
          lastWeekRate,
          trendData,
          courseAttendance,
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch attendance data from backend.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const rateChange = useMemo(() => {
    if (!stats?.lastWeekRate) return 0;
    return stats.attendanceRate - stats.lastWeekRate;
  }, [stats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="alert" aria-busy="true">
        <Loader2 className="animate-spin text-gray-500 dark:text-gray-400 w-8 h-8" />
        <span className="sr-only">Loading attendance analytics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        {error || "Unable to load attendance data."}
      </div>
    );
  }

  const pieData = [
    { name: "Present", value: stats.presentToday },
    { name: "Absent", value: stats.absentToday },
  ];
  const COLORS = ["#16a34a", "#dc2626"];

  const totalCourses = courses.length;
  const coursesFullAttendance = stats.courseAttendance.filter((c) => c.studentsAbsent === 0).length;
  const coursesPartialAttendance = totalCourses - coursesFullAttendance;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={stats.totalStudents} icon={Users} />
        <StatsCard
          title="Present Today"
          value={stats.presentToday}
          icon={TrendingUp}
          accentColor="green"
        />
        <StatsCard
          title="Absent Today"
          value={stats.absentToday}
          icon={TrendingDown}
          accentColor="red"
        />
        <StatsCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={Calendar}
        />
      </div>

      {/* Courses Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Courses" value={totalCourses} icon={Users} />
        <StatsCard
          title="Full Attendance"
          value={coursesFullAttendance}
          icon={TrendingUp}
          accentColor="green"
        />
        <StatsCard
          title="Partial Attendance"
          value={coursesPartialAttendance}
          icon={TrendingDown}
          accentColor="yellow"
        />
        <StatsCard
          title="Courses Today"
          value={totalCourses}
          icon={Calendar}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm bg-white dark:bg-gray-900 transition-colors">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-gray-200">
              Weekly Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={stats.trendData} />
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white dark:bg-gray-900 flex flex-col items-center justify-center py-4">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-gray-200">
              Today's Attendance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              {stats.presentToday} present / {stats.absentToday} absent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="shadow-sm bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-gray-200">
            Attendance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between gap-4 text-gray-700 dark:text-gray-300">
            <p>
              📈 The average attendance rate this week is{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {stats.attendanceRate}%
              </span>
              .
            </p>
            <p>
              {rateChange >= 0 ? (
                <span className="text-green-600 dark:text-green-400">
                  ▲ Up {rateChange}% from last week
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  ▼ Down {Math.abs(rateChange)}% from last week
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
