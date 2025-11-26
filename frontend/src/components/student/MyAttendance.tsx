import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getStudentSessions } from "@/services/studentApi"; // ✅ new import

interface AttendanceRecord {
  id: string;
  course_name: string;
  session_date: string;
  status: "Present" | "Absent" | "Late";
}

const MyAttendance: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance records from backend
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No authentication token found");

        // ✅ Using centralized API function
        const sessions = await getStudentSessions();

        // Transform API data into local format
        const data: AttendanceRecord[] = sessions.map((s) => ({
          id: s.id,
          course_name: s.courseName || "Unknown Course",
          session_date: s.session_date || "N/A",
          status: s.is_active ? "Present" : "Absent", // Simplified fallback logic
        }));

        setAttendanceData(data);
        setFilteredData(data);

        toast.success("Attendance records loaded!");
      } catch (err: any) {
        console.error("Error fetching attendance:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load attendance records. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // Filter by course
  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
    if (value === "All") setFilteredData(attendanceData);
    else setFilteredData(attendanceData.filter((rec) => rec.course_name === value));
  };

  // Calculate attendance stats
  const totalClasses = filteredData.length;
  const totalPresent = filteredData.filter((r) => r.status === "Present").length;
  const attendanceRate = totalClasses ? Math.round((totalPresent / totalClasses) * 100) : 0;

  const courses = Array.from(new Set(attendanceData.map((a) => a.course_name)));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🎓 My Attendance</h1>

      {/* Summary Card */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">Attendance Overview</h2>
              <p className="text-sm text-muted-foreground">
                Track your attendance for all registered courses
              </p>
            </div>

            <div className="w-64 space-y-2">
              <Label htmlFor="course-select">Select Course</Label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger id="course-select">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-muted-foreground">
              Attendance Rate: <span className="font-semibold">{attendanceRate}%</span>
            </p>
            <Progress value={attendanceRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin mr-2 h-6 w-6" />
              Loading attendance...
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-10">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.session_date}</TableCell>
                      <TableCell>{record.course_name}</TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === "Present"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                              : record.status === "Absent"
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {record.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAttendance;
