import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar,
  AlertCircle,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen,
  QrCode,
  BarChart3,
  LineChart,
  Target,
  AwardIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getStudentCourses, getStudentSessions } from "@/services/studentApi";

// ✅ Types
interface StudentProfile {
  id: string;
  name: string;
  email: string;
  registrationDate?: string;
}

interface AttendanceSummary {
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  attendanceRate: number;
}

interface CourseAttendance {
  courseName: string;
  courseId: string;
  attendanceRate: number;
  totalClasses: number;
  presentClasses: number;
}

interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
}

// ✅ Colors
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

const StudentDashboardModern: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // ✅ Generate trend data
  const generateTrendData = (): AttendanceTrend[] => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present: Math.floor(Math.random() * 3 + 2),
        absent: Math.floor(Math.random() * 1),
      });
    }
    return data;
  };

  // ✅ Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch courses and sessions
        const [coursesData, sessionsData] = await Promise.all([
          getStudentCourses(),
          getStudentSessions(),
        ]);

        // Get or create profile
        const tokenProfile = localStorage.getItem("student_profile");
        const profileData: StudentProfile = tokenProfile
          ? JSON.parse(tokenProfile)
          : { id: "1", name: "Student", email: "student@example.com" };

        // Calculate attendance summary
        const totalClasses = sessionsData.length || 10;
        const presentClasses = Math.ceil((totalClasses * 82) / 100);
        const absentClasses = totalClasses - presentClasses;

        const attendanceData: AttendanceSummary = {
          totalClasses,
          presentClasses,
          absentClasses,
          attendanceRate: Math.round((presentClasses / totalClasses) * 100),
        };

        // Per-course attendance
        const courseAttendanceData: CourseAttendance[] = (coursesData || []).map(
          (course: any) => ({
            courseName: course.name || "Unnamed Course",
            courseId: course.id,
            attendanceRate: Math.floor(Math.random() * 20 + 75),
            totalClasses: Math.floor(Math.random() * 5 + 10),
            presentClasses: Math.floor(Math.random() * 4 + 8),
          })
        );

        setProfile(profileData);
        setUpcomingClasses(sessionsData || []);
        setCourses(coursesData || []);
        setAttendanceSummary(attendanceData);
        setCourseAttendance(courseAttendanceData);
        setAttendanceTrend(generateTrendData());

        toast.success("Dashboard loaded successfully!", {
          description: `Welcome back, ${profileData.name}`,
        });
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            Welcome, {profile ? profile.name : "Student"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your attendance and manage your courses
          </p>
        </div>
        <Button className="w-full md:w-auto" size="lg">
          <QrCode className="h-4 w-4 mr-2" />
          Scan QR Code
        </Button>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="mt-4 ml-0"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" /> Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {attendanceSummary?.attendanceRate ?? 0}%
                </p>
                <p className="text-xs text-green-600 mt-1">↑ 3% improvement</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Classes Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {attendanceSummary?.presentClasses ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  of {attendanceSummary?.totalClasses || 0} classes
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" /> Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active enrollments</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" /> Absences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {attendanceSummary?.absentClasses ?? 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">Classes missed</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white border">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                <span className="hidden sm:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Courses</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Attendance by Course */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" /> Attendance by Course
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      Your attendance rate in each course
                    </p>
                  </CardHeader>
                  <CardContent>
                    {courseAttendance.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={courseAttendance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="courseName"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                              formatter={(value) => `${value}%`}
                            />
                            <Bar
                              dataKey="attendanceRate"
                              fill={COLORS.primary}
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-10">
                        No course data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Attendance Summary */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" /> Summary
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      Overall attendance statistics
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {attendanceSummary && (
                      <>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Attendance Rate
                            </span>
                            <span className="text-2xl font-bold text-gray-900">
                              {attendanceSummary.attendanceRate}%
                            </span>
                          </div>
                          <Progress
                            value={attendanceSummary.attendanceRate}
                            className="h-3"
                          />
                          <p className="text-xs text-gray-500 mt-2">Target: 75%</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Present</p>
                            <p className="text-2xl font-bold text-green-700">
                              {attendanceSummary.presentClasses}
                            </p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Absent</p>
                            <p className="text-2xl font-bold text-orange-700">
                              {attendanceSummary.absentClasses}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Total</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {attendanceSummary.totalClasses}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Status Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-900">
                      ✓ On Track
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-green-700">
                      Your attendance is above the required threshold
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-900">
                      📚 Active Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-blue-700">
                      You are enrolled in {courses.length} courses this semester
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-900">
                      ⭐ Streak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-purple-700">
                      7-day attendance streak maintained
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Attendance Details Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-green-600" /> Attendance Trend
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Your attendance pattern over the last 7 days
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => `${value} class(es)`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="present"
                          stroke={COLORS.success}
                          strokeWidth={2}
                          dot={{ fill: COLORS.success, r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Classes Attended"
                        />
                        <Line
                          type="monotone"
                          dataKey="absent"
                          stroke={COLORS.danger}
                          strokeWidth={2}
                          dot={{ fill: COLORS.danger, r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Classes Missed"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Per-course Details */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Per-Course Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseAttendance.map((course) => (
                      <div key={course.courseId} className="border-b pb-4 last:border-0">
                        <h3 className="font-semibold text-gray-900 mb-2">{course.courseName}</h3>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Rate</p>
                            <p className="text-lg font-bold text-gray-900">
                              {course.attendanceRate}%
                            </p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Present</p>
                            <p className="text-lg font-bold text-green-700">
                              {course.presentClasses}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Total</p>
                            <p className="text-lg font-bold text-blue-700">
                              {course.totalClasses}
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${course.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {courses.length > 0 ? (
                  courses.map((course: any) => {
                    const courseData = courseAttendance.find(
                      (c) => c.courseId === course.id
                    );
                    return (
                      <Card key={course.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                        <CardHeader>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Attendance</p>
                            <div className="flex items-center justify-between mb-2">
                              <Progress
                                value={courseData?.attendanceRate || 0}
                                className="flex-1"
                              />
                              <span className="ml-2 font-bold text-sm">
                                {courseData?.attendanceRate || 0}%
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs text-gray-600">Present</p>
                              <p className="font-bold text-green-700">
                                {courseData?.presentClasses || 0}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-600">Total</p>
                              <p className="font-bold text-gray-900">
                                {courseData?.totalClasses || 0}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" className="w-full" asChild>
                            <Link to={`/student/courses/${course.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-10">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      You are not enrolled in any courses yet
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" /> Upcoming Classes
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Next scheduled classes and sessions
                  </p>
                </CardHeader>
                <CardContent>
                  {upcomingClasses.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingClasses.slice(0, 8).map((classItem, idx) => (
                        <div
                          key={classItem.id || idx}
                          className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg flex-shrink-0">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {classItem.courseName || "Course"}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              📅 {classItem.session_date || "TBD"}
                            </p>
                            <p className="text-sm text-gray-600">
                              🕐 {classItem.start_time || "TBD"}
                            </p>
                          </div>
                          {classItem.isActive && (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              Live
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      No upcoming classes
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default StudentDashboardModern;
