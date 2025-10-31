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
import { toast } from "sonner";
import { Calendar, AlertCircle, Loader2 } from "lucide-react";
import {
  getStudentCourses,
  getStudentSessions,
} from "@/services/studentApi";

interface StudentProfile {
  id: string;
  name: string;
  email: string;
}

interface AttendanceSummary {
  totalClasses: number;
  presentClasses: number;
  attendanceRate: number;
}

const StudentDashboard: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch all student dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all API data
        const [courses, sessions] = await Promise.all([
          getStudentCourses(),
          getStudentSessions(),
        ]);

        // Simulate a profile from stored token or mock (backend route may differ)
        const tokenProfile = localStorage.getItem("student_profile");
        const profileData: StudentProfile = tokenProfile
          ? JSON.parse(tokenProfile)
          : { id: "1", name: "Student", email: "student@example.com" };

        // Generate attendance summary (for now, mock it)
        const attendanceData: AttendanceSummary = {
          totalClasses: sessions.length || 10,
          presentClasses: Math.floor((sessions.length || 10) * 0.8),
          attendanceRate:
            sessions.length > 0
              ? Math.floor(((sessions.length * 0.8) / sessions.length) * 100)
              : 0,
        };

        setProfile(profileData);
        setUpcomingClasses(sessions);
        setAttendanceSummary(attendanceData);

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        Welcome, {profile ? profile.name : "Student"}
      </h1>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin mr-2 h-6 w-6" />
          Loading dashboard...
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
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Name:</span> {profile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Email:</span> {profile.email}
                  </p>
                  <Button variant="outline" asChild className="w-full mt-4">
                    <Link to="/student/profile">Edit Profile</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No profile data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceSummary ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Attendance Rate:{" "}
                      <span className="font-semibold">
                        {attendanceSummary.attendanceRate}%
                      </span>
                    </p>
                    <Progress
                      value={attendanceSummary.attendanceRate}
                      className="h-2"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <p>Total Classes: {attendanceSummary.totalClasses}</p>
                    <p>Present: {attendanceSummary.presentClasses}</p>
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/student/attendance">View Full Attendance</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No attendance data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length > 0 ? (
                <div className="space-y-4">
                  {upcomingClasses.slice(0, 3).map((classItem) => (
                    <div
                      key={classItem.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {classItem.courseName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {classItem.session_date || "N/A"} at{" "}
                          {classItem.start_time || "TBD"}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {classItem.courseName.split(" ")[0]}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" asChild className="w-full mt-4">
                    <Link to="/student/courses">View All Courses</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming classes
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
