import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { User, AnalyticsData, Course, SystemLog } from "@/services/adminApi";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Book,
  Calendar,
  Plus,
  Download,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  LineChart,
  PieChart,
  Sun,
  Moon,
} from "lucide-react";
import ManageCourses from "./ManageCourses";
import { toast } from "sonner";
import CountUp from "react-countup";
import { Sparklines, SparklinesLine } from "react-sparklines";
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

import {
  getAnalytics,
  getCourseAnalytics,
  getSystemLogs,
  createUser,
  createCourse,
  getCourses,
  getDashboardStats,
} from "@/services/adminApi";

// ✅ Types
interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  activeCourses: number;
  totalSessions: number;
  averageAttendance?: number;
  systemHealth?: number;
}

interface AttendanceSummary {
  courseId: string;
  courseTitle: string;
  attendanceRate: number;
  studentCount: number;
  presentCount: number;
}

interface LogEntry {
  id: string;
  action: string;
  userId?: string;
  timestamp: string;
}

interface AttendanceTrend {
  date: string;
  attendance: number;
  target: number;
}

interface RoleDistribution {
  name: string;
  value: number;
  fill: string;
}

// ✅ Colors
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  secondary: "#8b5cf6",
};

// ✅ Component
const AdminDashboardModern: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceSummaries, setAttendanceSummaries] = useState<
    AttendanceSummary[]
  >([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>(
    []
  );
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>(
    []
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newUser, setNewUser] = useState<Omit<User, "id"> & { password?: string }>({
    name: "",
    email: "",
    role: "Student",
  });
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [timeRange, setTimeRange] = useState("week");
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedToastShown = useRef(false);
  const navigate = useNavigate();

  // New states for pro features
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [chronicAbsentees, setChronicAbsentees] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );

  // ✅ Generate mock trend data
  const generateTrendData = (): AttendanceTrend[] => {
    const data: AttendanceTrend[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        attendance: Math.floor(Math.random() * 30 + 65),
        target: 75,
      });
    }
    return data;
  };

  // Utility: small sparkline sample generator
  const sampleSparkline = (seed = 6) => {
    const arr: number[] = [];
    for (let i = 0; i < seed; i++) arr.push(Math.floor(Math.random() * 20 + 60));
    return arr;
  };

  // small helper to truncate long labels for charts and cards
  const truncate = (s: string | undefined, n = 24) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };

  // ✅ Fetch Data
  const fetchData = async () => {
    console.log("📊 Fetching admin dashboard data...");
    setLoading(true);
    setError(null);
    try {
      // Fetch analytics with defensive fallbacks and detailed logging
      let analytics: AnalyticsData | null = null;
      try {
        analytics = await getAnalytics();
        console.debug("Analytics fetched:", analytics);
      } catch (aErr) {
        console.error("Failed to fetch /api/admin/analytics:", aErr);
        // fallback to older dashboard endpoint which returns similar stats
        try {
          const dash = await getDashboardStats();
          console.debug("Fallback dashboard stats:", dash);
          // map dashboard shape to AnalyticsData where possible
          analytics = {
            totalStudents: dash.totalStudents ?? 0,
            totalLecturers: dash.totalLecturers ?? 0,
            totalCourses: dash.activeCourses ?? 0,
            totalSessions: dash.totalSessions ?? 0,
            attendanceRate: undefined,
            lastUpdated: undefined,
            // keep totalUsers for compatibility where used
            totalUsers: ((dash.totalStudents ?? 0) + (dash.totalLecturers ?? 0)) as any,
          } as AnalyticsData;
        } catch (bfErr) {
          console.error("Fallback dashboard endpoint also failed:", bfErr);
        }
      }

      const computedStats: DashboardStats = {
        totalStudents: analytics?.totalStudents ?? 0,
        totalLecturers: analytics?.totalLecturers ?? 0,
        activeCourses: analytics?.totalCourses ?? 0,
        totalSessions: analytics?.totalSessions ?? 0,
        averageAttendance: Math.floor(Math.random() * 20 + 70),
        systemHealth: 95,
      };

      setStats(computedStats);

      // Role distribution
      const roles: RoleDistribution[] = [
        { name: "Students", value: analytics?.totalStudents ?? 0, fill: COLORS.primary },
        { name: "Lecturers", value: analytics?.totalLecturers ?? 0, fill: COLORS.secondary },
        { name: "Admins", value: 1, fill: COLORS.success },
      ];
      setRoleDistribution(roles);

      // Attendance trend
      setAttendanceTrend(generateTrendData());

      // Courses list and per-course analytics. Each step is tolerant to failures.
      let courses: Course[] = [];
      try {
        const fetched = await getCourses();
        courses = Array.isArray(fetched) ? fetched : (fetched as any).courses || [];
        console.debug("Courses fetched:", courses.length);
      } catch (cErr) {
        console.error("Failed to fetch courses:", cErr);
        courses = [];
      }

      const attendanceData = await Promise.all(
        courses.map(async (course: Course) => {
          try {
            const courseAnalytics: any = await getCourseAnalytics(course.id);
            const avgAttendance = courseAnalytics?.avgAttendance ?? courseAnalytics?.attendance_rate ?? 0;
            const studentCount = (course as any).studentIds?.length || 0;
            const presentCount = Math.floor(studentCount * (avgAttendance / 100));

            return {
              courseId: course.id,
              courseTitle: course.name,
              attendanceRate: Math.round(avgAttendance),
              studentCount,
              presentCount,
            };
          } catch (caErr) {
            console.error(`Failed to fetch analytics for course ${course.id}:`, caErr);
            return {
              courseId: course.id,
              courseTitle: course.name,
              attendanceRate: 0,
              studentCount: (course as any).studentIds?.length || 0,
              presentCount: 0,
            };
          }
        })
      );
      setAttendanceSummaries(attendanceData);

      // compute chronic absentees from attendance summaries (below 60% and at least some students)
      const chronic = attendanceData
        .flatMap((c: AttendanceSummary) =>
          // this example treats per-course low attendance as a proxy; adapt to per-student call if you have it
          c.attendanceRate < 60 && c.studentCount > 0
            ? [
                {
                  courseId: c.courseId,
                  courseTitle: c.courseTitle,
                  attendanceRate: c.attendanceRate,
                },
              ]
            : []
        )
        .slice(0, 10);
      setChronicAbsentees(chronic);

      // Logs
      const logsRes = await getSystemLogs();
      setLogs(
        (logsRes || []).slice(0, 10).map((log: SystemLog) => ({
          id: log.id,
          action: log.action,
          userId: log.userId,
          timestamp: log.timestamp ?? new Date().toISOString(),
        }))
      );
    } catch (err: any) {
      console.error("❌ Dashboard fetch failed:", err);
      setError("Failed to load dashboard data");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ WebSocket - improved handling for live_feed and active_sessions
  const connectWebSocket = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:5000";
    const wsUrl = `${wsBase}/api/admin/ws?token=${token}`;

    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (err) {
      console.warn("WS creation failed", err);
      return;
    }

    wsRef.current.onopen = () => {
      console.log("✅ Admin WebSocket connected");
      // Show the connect toast only once per component lifecycle to avoid spam on reconnects
      if (!wsConnectedToastShown.current) {
        toast.success("Real-time updates connected", { duration: 2000 });
        wsConnectedToastShown.current = true;
      } else {
        // For subsequent reconnects, log quietly
        console.debug("Admin WebSocket reconnected (silent)");
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // If live feed payload
        if (data.live_feed) {
          // data.live_feed expected to be an array
          setLiveFeed((prev) => {
            const merged = [...(data.live_feed || []), ...prev].slice(0, 200); // cap
            return merged;
          });
        }

        if (data.active_sessions) {
          setActiveSessions(data.active_sessions);
        }

        // optional small toast animation for new markings
        if (data.message || (data.live_feed && data.live_feed.length > 0)) {
          const item = data.live_feed && data.live_feed[0];
          toast.custom((t) => (
            <div className="bg-white border shadow-lg rounded-lg p-4 animate-in slide-in-from-bottom">
              <p className="font-medium">{data.message || "New attendance marked!"}</p>
              {item ? (
                <p className="text-sm text-gray-500">
                  {item.student_name} → {item.course_name}
                </p>
              ) : null}
            </div>
          ), { duration: 3000 });
        }

        // legacy behavior: analytics update triggers refetch
        if (data.resource === "analytics" && data.operation === "update") {
          fetchData();
        }
      } catch (err) {
        console.error("⚠️ WS parse error:", err);
      }
    };

    wsRef.current.onclose = (ev) => {
      console.log("WS closed, reconnecting", ev.reason || "");
      // jittered reconnect
      const backoff = Math.min(30000, 1000 + Math.random() * 4000);
      setTimeout(connectWebSocket, backoff);
    };

    wsRef.current.onerror = (e) => {
      console.error("WS error", e);
      try {
        wsRef.current?.close();
      } catch (err) {}
    };
  };

  // ✅ Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email.trim() || !newUser.name.trim()) {
      return toast.error("Name and Email are required");
    }

    try {
      await createUser(newUser);
      setIsCreateUserOpen(false);
      toast.success(`User "${newUser.email}" created`);
      setNewUser({ name: "", email: "", role: "Student" });
      fetchData();
    } catch (err) {
      console.error("❌ Failed to create user:", err);
      toast.error("Failed to create user");
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return toast.error("Course title required");

    try {
      await createCourse({ name: newCourseTitle });
      setIsCreateCourseOpen(false);
      toast.success(`Course "${newCourseTitle}" created`);
      setNewCourseTitle("");
      fetchData();
    } catch (err) {
      console.error("❌ Failed to create course:", err);
      toast.error("Failed to create course");
    }
  };

  const handleExportData = () => {
    const csv = [
      ["Course ID", "Course Title", "Attendance Rate (%)", "Students", "Present"],
      ...attendanceSummaries.map((s) => [
        s.courseId,
        s.courseTitle,
        s.attendanceRate,
        s.studentCount,
        s.presentCount,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_summary_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  // dark mode toggle
  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  // ✅ Lifecycle
  useEffect(() => {
    fetchData();
    connectWebSocket();
    return () => wsRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // small skeleton to use when loading
  const SkeletonBlock: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded ${className}`} />
  );

  // ✅ Render
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
            Monitor system health, attendance, and user management
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center justify-start sm:justify-end">
          <Button onClick={handleExportData} variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>

          <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span>Add User</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v: "Student" | "Lecturer") =>
                      setNewUser({ ...newUser, role: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Lecturer">Lecturer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Create User
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span>Add Course</span>
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
                    placeholder="Enter course title"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Course
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" onClick={fetchData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </Alert>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="truncate">Total Students</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 min-w-[60px]">
                    <CountUp end={stats?.totalStudents ?? 0} duration={1.8} separator="," />
                  </p>
                  <div className="w-full sm:flex-1 sm:min-w-[100px] h-8 sm:h-9">
                    <Sparklines data={sampleSparkline()} margin={0}>
                      <SparklinesLine style={{ fill: 'none', strokeWidth: 2 }} />
                    </Sparklines>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">+5% from last week</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="truncate">Lecturers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 min-w-[60px]">
                    <CountUp end={stats?.totalLecturers ?? 0} duration={1.2} />
                  </p>
                  <div className="w-full sm:flex-1 sm:min-w-[100px] h-8 sm:h-9">
                    <Sparklines data={sampleSparkline()} margin={0}>
                      <SparklinesLine style={{ fill: 'none', strokeWidth: 2 }} />
                    </Sparklines>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Active instructors</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2">
                  <Book className="h-4 w-4 text-orange-600" />
                  <span className="truncate">Courses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 min-w-[60px]">
                    <CountUp end={stats?.activeCourses ?? 0} duration={1.2} />
                  </p>
                  <div className="w-full sm:flex-1 sm:min-w-[100px] h-8 sm:h-9">
                    <Sparklines data={sampleSparkline()} margin={0}>
                      <SparklinesLine style={{ fill: 'none', strokeWidth: 2 }} />
                    </Sparklines>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total courses</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="truncate">Sessions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 min-w-[60px]">
                    <CountUp end={stats?.totalSessions ?? 0} duration={1.2} />
                  </p>
                  <div className="w-full sm:flex-1 sm:min-w-[100px] h-8 sm:h-9">
                    <Sparklines data={sampleSparkline()} margin={0}>
                      <SparklinesLine style={{ fill: 'none', strokeWidth: 2 }} />
                    </Sparklines>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total sessions</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="truncate">Avg Attendance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 min-w-[60px]">
                    <CountUp end={stats?.averageAttendance ?? 0} duration={1.8} suffix="%" />
                  </p>
                  <div className="w-full sm:flex-1 sm:min-w-[100px] h-8 sm:h-9">
                    <Sparklines data={sampleSparkline()} margin={0}>
                      <SparklinesLine style={{ fill: 'none', strokeWidth: 2 }} />
                    </Sparklines>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">↑ 2% improvement</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-5 bg-white dark:bg-slate-800 border">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Overview</span>
                <span className="md:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                <span className="hidden md:inline">Attendance</span>
                <span className="md:hidden">Trend</span>
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span className="hidden md:inline">Users</span>
                <span className="md:hidden">Roles</span>
              </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  <span className="hidden md:inline">Courses</span>
                  <span className="md:hidden">Courses</span>
                </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden md:inline">Logs</span>
                <span className="md:hidden">Feed</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Live activity + Active sessions row */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Live attendance stream */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                      Live Attendance Stream
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Real-time attendance events
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-72 overflow-y-auto">
                    {liveFeed.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">No live events</p>
                    ) : (
                      liveFeed.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg animate-in slide-in-from-top">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{entry.student_name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{entry.course_name} • {entry.venue}</p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Active sessions */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Active Sessions Right Now
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Open QR sessions currently running</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {activeSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No active sessions</p>
                      ) : (
                        activeSessions.map((s: any) => (
                          <div key={s.session_id} className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-50 truncate">{s.course_name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">{s.venue}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs font-medium">{s.marked_count} marked</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Expires {new Date(s.qr_expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chronic absentees alert */}
                <div className="space-y-2">
                  {chronicAbsentees.length > 0 ? (
                    <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <AlertTitle>Chronic Absentees Detected ({chronicAbsentees.length})</AlertTitle>
                        <AlertDescription>
                          Some courses have average attendance below 60%.
                          <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setActiveTab("attendance")}>
                            View details →
                          </Button>
                        </AlertDescription>
                      </div>
                      <div className="mt-3 max-h-48 sm:max-h-60 overflow-y-auto">
                        {chronicAbsentees.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium truncate">{c.courseTitle}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{c.attendanceRate}%</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/courses/${c.courseId}`)} className="flex-shrink-0 text-xs sm:text-sm">
                              Open
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Alert>
                  ) : (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle>No Critical Alerts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-300">System operating normally</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" /> Attendance Rates by Course
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Visual comparison of attendance across all courses
                  </p>
                </CardHeader>
                <CardContent>
                  {attendanceSummaries.length > 0 ? (
                    <div className="w-full" style={{ height: window.innerWidth < 640 ? 250 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attendanceSummaries} margin={{ top: 10, right: 10, left: 0, bottom: window.innerWidth < 640 ? 60 : 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="courseTitle" angle={window.innerWidth < 640 ? -90 : -45} textAnchor={window.innerWidth < 640 ? "end" : "end"} height={window.innerWidth < 640 ? 80 : 100} interval={0} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                            formatter={(value) => `${value}%`}
                          />
                          <Bar dataKey="attendanceRate" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8 sm:py-10">
                      No attendance data available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Course Stats Grid */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {attendanceSummaries.slice(0, 4).map((course) => (
                  <Card key={course.courseId} className="border-0 shadow-sm">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="text-sm sm:text-base font-semibold truncate">
                        {course.courseTitle}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-gray-600 truncate">Attendance Rate</span>
                          <span className="font-bold text-gray-900 ml-2">{course.attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${course.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div className="bg-gray-50 dark:bg-slate-700 p-2 rounded">
                          <p className="text-gray-600 dark:text-gray-300 truncate">Total Students</p>
                          <p className="font-bold text-lg text-gray-900 dark:text-gray-50">{course.studentCount}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                          <p className="text-gray-600 dark:text-gray-300 truncate">Present</p>
                          <p className="font-bold text-lg text-green-700 dark:text-green-400">{course.presentCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Attendance Trend Tab */}
            <TabsContent value="attendance" className="space-y-4 sm:space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-green-600" />
                      <span>Attendance Trend</span>
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">
                      7-day performance vs target (75%)
                    </p>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  <div className="w-full" style={{ height: window.innerWidth < 640 ? 280 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={attendanceTrend} margin={{ top: 10, right: 10, left: window.innerWidth < 640 ? -20 : 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: window.innerWidth < 640 ? 11 : 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: window.innerWidth < 640 ? 11 : 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: '12px',
                          }}
                          formatter={(value) => `${value}%`}
                        />
                        <Legend wrapperStyle={{ fontSize: window.innerWidth < 640 ? '12px' : '14px' }} />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={{ fill: COLORS.primary, r: window.innerWidth < 640 ? 3 : 4 }}
                          activeDot={{ r: window.innerWidth < 640 ? 4 : 6 }}
                          name="Actual Attendance"
                        />
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke={COLORS.warning}
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          name="Target (75%)"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Distribution Tab */}
            <TabsContent value="distribution" className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" /> User Distribution
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Breakdown of system users by role
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full" style={{ height: window.innerWidth < 640 ? 220 : 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={roleDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={window.innerWidth < 640 ? false : ({ name, value }) => `${name}: ${value}`}
                            outerRadius={window.innerWidth < 640 ? 60 : 80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {roleDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} users`} contentStyle={{ fontSize: '12px' }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">User Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {roleDistribution.map((role) => (
                      <div key={role.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div
                            className="w-3 h-3 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: role.fill }}
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{role.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{role.value}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {Math.round(
                              (role.value /
                                Math.max(1, roleDistribution.reduce((sum, r) => sum + r.value, 0))) *
                                100
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4 sm:space-y-6">
              <ManageCourses />
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-600" /> Recent System Activity
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Last 10 system actions</p>
                </CardHeader>
                <CardContent>
                  {logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{log.action}</p>
                              {log.userId && <p className="text-xs text-gray-500 dark:text-gray-300">User: {log.userId}</p>}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-300 flex-shrink-0 ml-2">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent activity
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Quick Actions Floating Bar */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <Button size="lg" className="rounded-full shadow-lg" onClick={() => setIsCreateUserOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
        <Button size="lg" className="rounded-full shadow-2xl bg-green-600 hover:bg-green-700" onClick={handleExportData}>
          <Download className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboardModern;
