import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, RefreshCw, Calendar, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api"; // ✅ shared axios instance

interface SessionSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  startTime: string;
  isActive: boolean;
  qrUuid?: string;
  expiresAt?: string;
}

interface StudentSummary {
  id: string;
  name: string;
  indexNumber: string;
}

// Schema for session creation
const sessionSchema = z.object({
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date and time",
  }),
});

// Schema for manual attendance
const attendanceSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
});

type SessionFormValues = z.infer<typeof sessionSchema>;
type AttendanceFormValues = z.infer<typeof attendanceSchema>;

const SessionsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);

  const sessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      startTime: new Date().toISOString().slice(0, 16),
    },
  });

  const attendanceForm = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      studentId: "",
    },
  });

  // Fetch sessions + students
  const fetchData = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        api.get(`/sessions/course/${courseId}`),
        api.get(`/courses/${courseId}/students`),
      ]);

      setSessions(sessionsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to load sessions or students";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create new session
  const handleCreateSession = async (data: SessionFormValues) => {
    try {
      const res = await api.post(`/sessions`, { courseId, startTime: data.startTime });
      const newSession: SessionSummary = res.data;
      setSessions((prev) => [newSession, ...prev]);
      toast.success("Session created successfully!");
      setIsSessionDialogOpen(false);
      sessionForm.reset();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to create session";
      toast.error(errorMessage);
    }
  };

  // Close session
  const handleCloseSession = async (sessionId: string) => {
    try {
      await api.patch(`/sessions/${sessionId}/close`);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, isActive: false } : s)));
      toast.success("Session closed successfully!");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to close session";
      toast.error(errorMessage);
    }
  };

  // Manual attendance
  const handleManualAttendance = async (data: AttendanceFormValues) => {
    if (!selectedSession) return;
    try {
      await api.post(`/attendance/manual`, {
        sessionId: selectedSession.id,
        studentId: data.studentId,
      });

      toast.success("Attendance recorded successfully!");
      setIsAttendanceDialogOpen(false);
      attendanceForm.reset();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to record attendance";
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Course Sessions</CardTitle>
          <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <Form {...sessionForm}>
                <form onSubmit={sessionForm.handleSubmit(handleCreateSession)} className="space-y-4">
                  <FormField
                    control={sessionForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={sessionForm.formState.isSubmitting}>
                      {sessionForm.formState.isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Session
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsSessionDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {sessions.length ? (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="p-3 bg-background rounded-md border border-border flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">{session.courseTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.startTime).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {session.isActive ? "Active" : "Closed"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {session.isActive && (
                    <Dialog
                      open={isQrDialogOpen && selectedSession?.id === session.id}
                      onOpenChange={(open) => {
                        setIsQrDialogOpen(open);
                        if (open) setSelectedSession(session);
                        else setSelectedSession(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-2" />
                          Show QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Session QR Code</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center">
                          {session.qrUuid ? (
                            <QRCodeCanvas
                              value={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/attendance/submit/${session.qrUuid}`}
                              size={200}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">QR code not available</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {session.isActive && (
                    <Dialog
                      open={isAttendanceDialogOpen && selectedSession?.id === session.id}
                      onOpenChange={(open) => {
                        setIsAttendanceDialogOpen(open);
                        if (open) setSelectedSession(session);
                        else setSelectedSession(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Mark Attendance
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manual Attendance</DialogTitle>
                        </DialogHeader>
                        <Form {...attendanceForm}>
                          <form onSubmit={attendanceForm.handleSubmit(handleManualAttendance)} className="space-y-4">
                            <FormField
                              control={attendanceForm.control}
                              name="studentId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Student</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a student" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {students.map((student) => (
                                          <SelectItem key={student.id} value={student.id}>
                                            {student.name} ({student.indexNumber})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <Button type="submit" disabled={attendanceForm.formState.isSubmitting}>
                                {attendanceForm.formState.isSubmitting && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Record Attendance
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button variant="link" className="text-primary hover:underline" asChild>
                    <Link to={`/lecturer/attendance/${session.id}`}>View Attendance</Link>
                  </Button>

                  {session.isActive && (
                    <Button variant="outline" size="sm" onClick={() => handleCloseSession(session.id)}>
                      Close Session
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions created for this course yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionsPage;
