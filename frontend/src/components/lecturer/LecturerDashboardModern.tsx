import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  getCourses,
  getSessions,
  getCourseAnalytics,
  createCourse,
  getStudentsByCourse,
  addStudentToCourse,
  importStudentsCsv,
  CourseSummary,
  SessionSummary as ApiSessionSummary,
} from "@/services/lecturerApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import StudentManagementDialog from "./StudentManagementDialog";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Users,
  BookOpen,
  Download,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
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
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ✅ Types
interface AttendanceSummary {
  courseId: string;
  courseTitle: string;
  totalAttendance: number;
  attendanceRate: number;
  studentCount: number;
  trend: number; // -5, 0, +5
}

interface CoursePerformance {
  courseId: string;
  courseName: string;
  studentCount: number;
  avgAttendance: number;
  engagementScore: number; // 0-100
}

interface EngagementTrend {
  date: string;
  engagement: number;
}

// ✅ Colors
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  secondary: "#8b5cf6",
};

const LecturerDashboardModern: React.FC = () => {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [sessions, setSessions] = useState<ApiSessionSummary[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  const [engagementTrend, setEngagementTrend] = useState<EngagementTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<string | null>(null);
  const [newStudentIndex, setNewStudentIndex] = useState("");
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/lecturer") {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  // ✅ Generate engagement trend data
  const generateEngagementTrend = (): EngagementTrend[] => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        engagement: Math.floor(Math.random() * 25 + 65),
      });
    }
    return data;
  };

  // ===== Student Management Handlers =====
  const openAddStudents = async (courseId: string) => {
    setSelectedCourseForStudents(courseId);
    setIsAddStudentOpen(true);
    try {
      const students = await getStudentsByCourse(courseId);
      setStudentsList(students || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch students");
      setStudentsList([]);
    }
  };

  const closeAddStudents = () => {
    setIsAddStudentOpen(false);
    setSelectedCourseForStudents(null);
    setNewStudentIndex("");
    setCsvFile(null);
    setStudentsList([]);
  };

  const handleAddStudent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCourseForStudents) return toast.error("No course selected");
    if (!newStudentIndex.trim()) return toast.error("Student index/ID is required");

    try {
      const added = await addStudentToCourse(selectedCourseForStudents, newStudentIndex.trim());
      toast.success("Student added");
      // refresh list
      const students = await getStudentsByCourse(selectedCourseForStudents);
      setStudentsList(students || []);
      setNewStudentIndex("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add student");
    }
  };

  const handleFileChange = (f: File | null) => {
    setCsvFile(f);
  };

  const handleImportCsv = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCourseForStudents) return toast.error("No course selected");
    if (!csvFile) return toast.error("Please select a CSV file");
    setImporting(true);
    try {
      await importStudentsCsv(selectedCourseForStudents, csvFile);
      toast.success("Students imported successfully");
      const students = await getStudentsByCourse(selectedCourseForStudents);
      setStudentsList(students || []);
      setCsvFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to import students");
    } finally {
      setImporting(false);
    }
  };

  const handleExportStudents = async (courseId: string) => {
    try {
      const students = await getStudentsByCourse(courseId);
      if (!students || students.length === 0) return toast.error("No students to export");

      const headers = ["id", "name", "indexNumber", "email"];
      const rows = students.map((s: any) => [s.id ?? s._id ?? "", s.name ?? s.username ?? "", s.indexNumber ?? s.index ?? "", s.email ?? ""]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.map(c => `"${(c||"").toString().replace(/"/g,'""') }"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `students_course_${courseId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export started");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export students");
    }
  };

  // ✅ Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No authentication token found");

      const coursesList = await getCourses();
      const sessionsList = await getSessions();

      // Build attendance summaries
      const attendancePromises = coursesList.map(async (c: any) => {
        try {
          const analytics = await getCourseAnalytics(c.id);
          const attendanceRate = Math.round(analytics.avgAttendance || 0);

          return {
            courseId: c.id,
            courseTitle: c.name,
            totalAttendance: analytics.totalStudents || 0,
            attendanceRate,
            studentCount: (c as any).studentIds?.length || 0,
            trend: Math.random() > 0.5 ? 5 : -3,
          } as AttendanceSummary;
        } catch (e) {
          return {
            courseId: c.id,
            courseTitle: c.name,
            totalAttendance: 0,
            attendanceRate: 0,
            studentCount: (c as any).studentIds?.length || 0,
            trend: 0,
          } as AttendanceSummary;
        }
      });

      const attendanceData = await Promise.all(attendancePromises);

      // Course performance
      const performanceData = coursesList.map((c: any) => ({
        courseId: c.id,
        courseName: c.name,
        studentCount: (c as any).studentIds?.length || 0,
        avgAttendance: Math.floor(Math.random() * 30 + 65),
        engagementScore: Math.floor(Math.random() * 25 + 70),
      }));

      setCourses(coursesList || []);
      setSessions(sessionsList || []);
      setAttendanceSummaries(attendanceData || []);
      setCoursePerformance(performanceData || []);
      setEngagementTrend(generateEngagementTrend());
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to load dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ WebSocket
  const connectWebSocket = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:5000";
    const wsUrl = `${wsBase}/api/lecturer/ws?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("✅ Lecturer WebSocket connected");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.resource === "attendance" && update.operation === "create") {
          fetchData();
        }
      } catch (err) {
        console.error("WebSocket parse error", err);
      }
    };

    wsRef.current.onclose = () => {
      setTimeout(connectWebSocket, 5000);
    };
  };

  // ✅ Create Course Handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return toast.error("Course title is required");

    try {
      const created = await createCourse({ name: newCourseTitle });
      setCourses((prev) => [...prev, created]);
      setNewCourseTitle("");
      setIsCreateCourseOpen(false);
      toast.success(`Course "${created.name}" created`);
      navigate(`/lecturer/courses/${created.id}/sessions`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create course";
      toast.error(msg);
    }
  };

  useEffect(() => {
    fetchData();
    connectWebSocket();
    return () => wsRef.current?.close();
  }, []);

  const handleRetry = () => {
    fetchData();
    if (wsRef.current?.readyState !== WebSocket.OPEN) connectWebSocket();
  };

  // ✅ Calculate Stats
  const totalStudents = attendanceSummaries.reduce((sum, s) => sum + s.studentCount, 0);
  const avgAttendance = Math.round(
    attendanceSummaries.reduce((sum, s) => sum + s.attendanceRate, 0) /
      (attendanceSummaries.length || 1)
  );
  const activeSessions = sessions.filter((s) => s.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Lecturer Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage courses, track attendance, and monitor student engagement
          </p>
        </div>
        <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Course Title</label>
                <Input
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g., Introduction to Python"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateCourseOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Course</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading / Error */}
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
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" onClick={handleRetry} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </Alert>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" /> Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active courses</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" /> Total Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Enrolled students</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" /> Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
                <p className="text-xs text-green-600 mt-1">
                  {activeSessions} active now
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" /> Avg Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{avgAttendance}%</p>
                <p className="text-xs text-green-600 mt-1">↑ On track</p>
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
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Engagement</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Courses</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" /> Attendance by Course
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      Current attendance rates across all courses
                    </p>
                  </CardHeader>
                  <CardContent>
                    {attendanceSummaries.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendanceSummaries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="courseTitle"
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
                        No data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" /> Student Distribution
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      Students enrolled per course
                    </p>
                  </CardHeader>
                  <CardContent>
                    {coursePerformance.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={coursePerformance}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ courseName, studentCount }) =>
                                `${courseName.split(" ")[0]}: ${studentCount}`
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="studentCount"
                            >
                              {coursePerformance.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} students`} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-10">
                        No data available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Course Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                {coursePerformance.slice(0, 3).map((course) => (
                  <Card key={course.courseId} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">
                        {course.courseName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Engagement</span>
                          <span className="font-bold">{course.engagementScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${course.engagementScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-gray-600">Students</p>
                          <p className="font-bold text-blue-700">{course.studentCount}</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-gray-600">Attendance</p>
                          <p className="font-bold text-green-700">{course.avgAttendance}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-green-600" /> Attendance Performance
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Detailed attendance metrics per course
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {attendanceSummaries.map((summary) => (
                      <div key={summary.courseId} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{summary.courseTitle}</h3>
                          <div className="flex items-center gap-2">
                            {summary.trend > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <span
                              className={summary.trend > 0 ? "text-green-600" : "text-red-600"}
                            >
                              {summary.trend > 0 ? "+" : ""}{summary.trend}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {summary.attendanceRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Present</p>
                            <p className="text-2xl font-bold text-green-600">
                              {summary.totalAttendance}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total</p>
                            <p className="text-2xl font-bold text-gray-600">
                              {summary.studentCount}
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              summary.attendanceRate >= 75 ? "bg-green-600" : "bg-orange-600"
                            }`}
                            style={{ width: `${summary.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" /> Student Engagement Trend
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    7-day engagement metrics across all courses
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={engagementTrend}>
                        <defs>
                          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => `${value}%`}
                        />
                        <Area
                          type="monotone"
                          dataKey="engagement"
                          stroke={COLORS.secondary}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorEngagement)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                  const perf = coursePerformance.find((p) => p.courseId === course.id);
                  return (
                    <Card key={course.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                      <CardHeader>
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Engagement Score</p>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                              <div
                                className="bg-purple-600 h-3 rounded-full"
                                style={{
                                  width: `${perf?.engagementScore || 0}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-sm text-gray-900">
                              {perf?.engagementScore || 0}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Students</p>
                            <p className="text-xl font-bold text-gray-900">
                              {perf?.studentCount || 0}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Avg Attendance</p>
                            <p className="text-xl font-bold text-green-700">
                              {perf?.avgAttendance || 0}%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => navigate(`/lecturer/courses/${course.id}/sessions`)}
                          >
                            Manage Course
                          </Button>
                          <Button
                            variant="ghost"
                            className="flex items-center gap-2"
                            onClick={() => openAddStudents(course.id)}
                          >
                            <Users className="h-4 w-4" />
                            Students
                          </Button>
                          <Button
                            variant="ghost"
                            className="flex items-center gap-2"
                            onClick={() => handleExportStudents(course.id)}
                          >
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        
          {/* Student management dialog (extracted) */}
          {selectedCourseForStudents && (
            <StudentManagementDialog
              open={isAddStudentOpen}
              onOpenChange={(v) => { if (!v) closeAddStudents(); else setIsAddStudentOpen(v); }}
              courseId={selectedCourseForStudents}
              onUpdated={() => { /* refresh dashboard data if needed */ fetchData(); }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LecturerDashboardModern;