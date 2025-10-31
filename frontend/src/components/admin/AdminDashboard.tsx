import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@/services/adminApi";
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
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Book,
  Calendar,
  Plus,
  Download,
  Activity,
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
} from "recharts";

// ✅ Import Admin API
import {
  getAnalytics,
  getCourseAnalytics,
  getSystemLogs,
  createUser,
  createCourse,
  getCourses,
} from "@/services/adminApi";

// ---------------- Types ----------------
interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  activeCourses: number;
  totalSessions: number;
}

interface AttendanceSummary {
  courseId: string;
  courseTitle: string;
  attendanceRate: number;
}

interface LogEntry {
  id: string;
  action: string;
  userId?: string; // optional
  timestamp: string;
}

// ---------------- Component ----------------
const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, "id"> & { password?: string }>({
    name: "",
    email: "",
    role: "Student",
  });
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [timeRange, setTimeRange] = useState("week");
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  // ---------------- Fetch Data ----------------
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Analytics
      const analytics = await getAnalytics();
      setStats({
        totalStudents: analytics.totalUsers,
        totalLecturers: analytics.totalLecturers,
        activeCourses: analytics.totalCourses,
        totalSessions: 0,
      });

      // Courses
      const courses = await getCourses();

      // Attendance summaries
      const attendanceData = await Promise.all(
        courses.map(async (course) => {
          const courseAnalytics = await getCourseAnalytics(course.id);
          return {
            courseId: course.id,
            courseTitle: course.name,
            attendanceRate: courseAnalytics.avgAttendance,
          };
        })
      );
      setAttendanceSummaries(attendanceData);

      // Recent logs
      const logsRes = await getSystemLogs();
      setLogs(
        logsRes.slice(0, 5).map((log) => ({
          id: log.id,
          action: log.action,
          userId: log.userId,
          timestamp: log.timestamp ?? new Date().toISOString(), // ensure string
        }))
      );
    } catch (err: any) {
      setError("Failed to load dashboard data");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- WebSocket ----------------
  const connectWebSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:5000"}/api/admin/ws?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => console.log("Admin WS connected");
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.operation === "create" && data.resource === "log") {
        const newLog: LogEntry = {
          id: data.log.id,
          action: data.log.action,
          userId: data.log.userId,
          timestamp: data.log.timestamp ?? new Date().toISOString(),
        };
        setLogs((prev) => [newLog, ...prev].slice(0, 5));
        toast.info(`New log: ${data.log.action}`);
      }
    };
    wsRef.current.onclose = () => console.warn("Admin WS disconnected");
  };

  // ---------------- Handlers ----------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email.trim() || !newUser.name.trim()) return toast.error("Name and Email are required");

    try {
      await createUser(newUser);
      setIsCreateUserOpen(false);
      toast.success(`User "${newUser.email}" created`);
      fetchData();
    } catch {
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
      fetchData();
    } catch {
      toast.error("Failed to create course");
    }
  };

  const handleExportData = () => {
    const csv = [
      ["Course ID", "Course Title", "Attendance Rate (%)"],
      ...attendanceSummaries.map((s) => [s.courseId, s.courseTitle, s.attendanceRate]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_summary_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance data exported");
  };

  useEffect(() => {
    fetchData();
    connectWebSocket();
    return () => wsRef.current?.close();
  }, [timeRange]);

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header & Buttons */}
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>

          {/* Create User Dialog */}
          <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Plus className="h-4 w-4 mr-2" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                <Select
                  value={newUser.role}
                  onValueChange={(v: "Student" | "Lecturer") =>
                    setNewUser({ ...newUser, role: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit">Create</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Course Dialog */}
          <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Plus className="h-4 w-4 mr-2" /> Add Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <Input
                  placeholder="Course title"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                />
                <Button type="submit">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" onClick={fetchData} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </Alert>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Total Students", value: stats?.totalStudents, icon: Users },
              { title: "Total Lecturers", value: stats?.totalLecturers, icon: Users },
              { title: "Active Courses", value: stats?.activeCourses, icon: Book },
              { title: "Total Sessions", value: stats?.totalSessions, icon: Calendar },
            ].map((s, i) => (
              <Card key={i} className="hover:shadow-md transition-all">
                <CardHeader className="pb-2 flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex gap-2 items-center text-muted-foreground">
                    <s.icon className="h-4 w-4" /> {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value ?? "N/A"}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance Rates by Course</CardTitle>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="semester">Last Semester</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {attendanceSummaries.length ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer>
                    <BarChart data={attendanceSummaries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="courseTitle" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="attendanceRate" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendance data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length ? (
                <ul className="space-y-2">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className="flex justify-between text-sm border-b pb-1 text-muted-foreground"
                    >
                      <span>{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent logs found</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
