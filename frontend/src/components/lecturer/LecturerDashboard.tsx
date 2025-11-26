import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import LecturerSidebar from "./LecturerSidebar";
import LecturerHeader from "./LecturerHeader";
import CourseList from "./CourseList";

import {
  getCourses,
  getSessions,
  getCourseAnalytics,
  createCourse,
} from "@/services/lecturerApi";
import { CourseSummary, SessionSummary as ApiSession } from "@/services/lecturerApi";

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
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Session type enriched for the dashboard
interface SessionSummary extends ApiSession {
  courseTitle: string;
  startTime: string;
  isActive: boolean;
}

interface AttendanceSummary {
  courseId: string;
  courseTitle: string;
  totalAttendance: number;
  attendanceRate: number;
}

const LecturerDashboard: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = useRef(1000);

  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/lecturer") {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  // Fetch all dashboard data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No authentication token found");

      const coursesList = await getCourses();
      const rawSessions = await getSessions();

      // Enrich sessions with readable fields
      const mappedSessions: SessionSummary[] = rawSessions.map(s => ({
        ...s,
        courseTitle: coursesList.find(c => c.id === s.courseId)?.name ?? "Unknown",
        startTime: s.start_time ?? "",
        isActive: Boolean(s.is_active),
      }));

      // Fetch analytics for each course
      const attendancePromises = coursesList.map(async (c) => {
        try {
          const analytics = await getCourseAnalytics(c.id);
          return {
            courseId: c.id,
            courseTitle: c.name,
            totalAttendance: analytics.totalStudents || 0,
            attendanceRate: Math.round((analytics.avgAttendance || 0) * 100) / 100,
          } as AttendanceSummary;
        } catch {
          return {
            courseId: c.id,
            courseTitle: c.name,
            totalAttendance: 0,
            attendanceRate: 0,
          };
        }
      });

      const attendanceData = await Promise.all(attendancePromises);

      setCourses(coursesList);
      setSessions(mappedSessions);
      setAttendanceSummaries(attendanceData);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to load dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = (totalAttendance: number, courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    const totalStudents = course?.studentIds?.length || 1;
    return Math.round((totalAttendance / totalStudents) * 100);
  };

  // WebSocket connection
  const connectWebSocket = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("No authentication token found");
      return;
    }

    const wsBase = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:5000";
    const wsUrl = `${wsBase}/api/lecturer/ws?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      reconnectAttempts.current = 0;
      reconnectInterval.current = 1000;
      setError(null);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);

        if (update.resource === "course") {
          if (update.operation === "create") {
            const newCourse: CourseSummary = update.course;
            setCourses(prev =>
              prev.some(c => c.id === newCourse.id) ? prev : [...prev, newCourse]
            );
            toast.success(`New course "${newCourse.name}" added`);
          }

          if (update.operation === "delete") {
            setCourses(prev => prev.filter(c => c.id !== update.courseId));
            toast.info("Course deleted");
          }
        }

        if (update.resource === "session" && update.operation === "create") {
          const s = update.session;

          const newSession: SessionSummary = {
            ...s,
            courseTitle: courses.find(c => c.id === s.courseId)?.name ?? "Unknown",
            startTime: s.start_time ?? "",
            isActive: Boolean(s.is_active),
          };

          setSessions(prev =>
            prev.some(sess => sess.id === newSession.id)
              ? prev
              : [newSession, ...prev].slice(0, 5)
          );

          toast.success(`New session for "${newSession.courseTitle}" created`);
        }

        if (update.resource === "attendance" && update.operation === "create") {
          const attendance = update.attendance;

          setAttendanceSummaries(prev => {
            const summary = prev.find(s => s.courseId === attendance.courseId);
            if (summary) {
              return prev.map(s =>
                s.courseId === attendance.courseId
                  ? {
                      ...s,
                      totalAttendance: s.totalAttendance + 1,
                      attendanceRate: calculateAttendanceRate(
                        s.totalAttendance + 1,
                        s.courseId
                      ),
                    }
                  : s
              );
            }
            return prev;
          });

          toast.success("New attendance recorded");
        }
      } catch (err) {
        console.error("WebSocket parsing error", err);
      }
    };

    wsRef.current.onerror = () => setError("Real-time updates unavailable");

    wsRef.current.onclose = () => {
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setTimeout(
          connectWebSocket,
          reconnectInterval.current * Math.pow(2, reconnectAttempts.current)
        );
      } else {
        setError("Unable to connect to real-time updates after several attempts");
        toast.error("Unable to connect to real-time updates");
      }
    };
  };

  // Handle course creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return toast.error("Course title is required");

    try {
      const created = await createCourse({ name: newCourseTitle });
      setCourses(prev => [...prev, created]);
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

  return (
    <div className="min-h-screen flex bg-background">
      <LecturerSidebar />
      <div className="flex-1 flex flex-col md:ml-64">
        <LecturerHeader />
        <main className="p-4 md:p-6">
          {children ?? (
            <div className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-semibold">Lecturer Dashboard</CardTitle>

                  <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 mr-2" />Create Course</Button>
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
                            onChange={e => setNewCourseTitle(e.target.value)}
                            placeholder="Enter course title"
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
                          <Button type="submit">Create</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent className="p-4">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                    </div>
                  ) : error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-5 w-5" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleRetry}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </Alert>
                  ) : (
                    <>
                      {/* Summary cards */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Total Courses
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{courses.length}</div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Total Sessions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{sessions.length}</div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Active Sessions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {sessions.filter(s => s.isActive).length}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Total Attendance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {attendanceSummaries.reduce(
                                (sum, s) => sum + s.totalAttendance,
                                0
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Attendance chart */}
                      <Card className="border-0 shadow-sm mb-6">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">
                            Attendance Rates by Course
                          </CardTitle>
                        </CardHeader>

                        <CardContent>
                          {attendanceSummaries.length ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceSummaries}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="courseTitle" />
                                  <YAxis domain={[0, 100]} />
                                  <Tooltip />
                                  <Bar dataKey="attendanceRate" fill="#3b82f6" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              No attendance data available.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Course list */}
                      <Card className="border-0 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">Your Courses</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CourseList courses={courses} />
                        </CardContent>
                      </Card>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LecturerDashboard;
