import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { getStudentCourses, StudentCourse } from "@/services/studentApi"; // ✅ Import types

interface Course {
  id: string;
  name: string;
  code?: string;
  lecturerId?: string;
  description?: string;
  status: "Active" | "Completed" | "Upcoming";
}

const MyCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const data: StudentCourse[] = await getStudentCourses();

        // Map StudentCourse → Course with default status
        const mappedCourses: Course[] = data.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          lecturerId: c.lecturerId,
          description: c.description,
          status: "Active", // default value
        }));

        setCourses(mappedCourses);
      } catch (err: any) {
        console.error("Error fetching courses:", err);
        setError(err.message || "Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        📚 My Courses
      </h1>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Enrolled Courses</CardTitle>
          <p className="text-sm text-muted-foreground">
            View all courses you are currently enrolled in
          </p>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin mr-2 h-6 w-6" />
              Loading courses...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : courses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.code || "N/A"}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          course.status === "Active"
                            ? "default"
                            : course.status === "Completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {course.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Link to={`/student/attendance?course=${course.id}`}>
                          View Attendance
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No courses found. Please enroll in a course to view details.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyCourses;
