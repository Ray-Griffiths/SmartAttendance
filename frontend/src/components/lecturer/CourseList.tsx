import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, BookOpen, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getCourses, CourseSummary as APICourse, createCourse } from "@/services/lecturerApi";

// Local type for UI consistency
interface LocalCourse {
  id: string;
  code: string;
  title: string;
  studentCount: number;
}

interface CourseListProps {
  courses?: APICourse[];
  onSelect?: (courseId: string) => void;
}

// Course creation schema
const courseSchema = z.object({
  code: z.string().min(3).max(10),
  title: z.string().min(5).max(100),
});

type CourseFormValues = z.infer<typeof courseSchema>;

const CourseList: React.FC<CourseListProps> = ({ courses: initialCourses = [], onSelect }) => {
  const [courses, setCourses] = useState<LocalCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"title" | "code">("title");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { code: "", title: "" },
  });

  // Map API response to LocalCourse
  const mapAPICourse = (c: APICourse): LocalCourse => ({
    id: c.id,
    code: c.code || "",
    title: c.name || "Untitled Course",
    studentCount: (c as any).studentIds?.length || 0,
  });

  // Fetch courses
  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourses();
      const mapped = data.map(mapAPICourse);
      const sorted = [...mapped].sort((a, b) =>
        sortBy === "title" ? a.title.localeCompare(b.title) : a.code.localeCompare(b.code)
      );
      setCourses(sorted);
    } catch (err: any) {
      const msg = err.message || "Failed to load your courses";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Create course handler
  const handleCreateCourse = async (data: CourseFormValues) => {
    try {
      // Map form title -> API name
      const payload = {
        code: data.code,
        name: data.title,
      };

      const newCourseAPI = await createCourse(payload);
      const newCourse = mapAPICourse(newCourseAPI);

      setCourses((prev) => {
        const updated = [...prev, newCourse].sort((a, b) =>
          sortBy === "title" ? a.title.localeCompare(b.title) : a.code.localeCompare(b.code)
        );
        toast.success(`Course "${newCourse.title}" created successfully!`);
        return updated;
      });

      setIsDialogOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to create course");
    }
  };

  // WebSocket for real-time updates
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:5000";
    const wsUrl = `${wsBase}/api/courses/ws/lecturer?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.operation === "create") {
          const newCourse = mapAPICourse(update.course);
          setCourses((prev) => {
            if (prev.some((c) => c.id === newCourse.id)) return prev;
            const updated = [...prev, newCourse].sort((a, b) =>
              sortBy === "title" ? a.title.localeCompare(b.title) : a.code.localeCompare(b.code)
            );
            toast.success(`Course "${newCourse.title}" created successfully!`);
            return updated;
          });
        } else if (update.operation === "delete") {
          setCourses((prev) => prev.filter((c) => c.id !== update.courseId));
          toast.info("Course deleted");
        }
      } catch {
        toast.error("Failed to process course update");
      }
    };

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sortBy]);

  // ✅ Fixed: fetch only once or when initialCourses changes (removed sortBy to prevent loop)
  useEffect(() => {
    if (!initialCourses.length) fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourses]);

  // ✅ Optional: re-sort locally when sortBy changes (no refetch)
  useEffect(() => {
    setCourses((prev) =>
      [...prev].sort((a, b) =>
        sortBy === "title" ? a.title.localeCompare(b.title) : a.code.localeCompare(b.code)
      )
    );
  }, [sortBy]);

  const handleRetry = () => fetchCourses();
  const toggleSort = () => setSortBy(sortBy === "title" ? "code" : "title");

  // Render loading, error, empty states
  if (loading)
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Loading your courses...</p>
        </CardContent>
      </Card>
    );

  if (error)
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );

  if (!courses.length)
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">No courses created yet.</p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Create First Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateCourse)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Code</FormLabel>
                        <FormControl>
                          <Input placeholder="CS101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Intro to Programming" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Course
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );

  // Render course list
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Your Courses ({courses.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleSort}>
              Sort by {sortBy === "title" ? "Code" : "Title"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateCourse)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Code</FormLabel>
                          <FormControl>
                            <Input placeholder="CS101" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Intro to Programming" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Course
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {courses.map((course) => (
            <li
              key={course.id}
              className="p-3 bg-background rounded-md border border-border flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium text-foreground">{course.title}</div>
                  <div className="text-xs text-muted-foreground">{course.code}</div>
                  <div className="text-xs text-muted-foreground">Students: {course.studentCount}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/lecturer/courses/${course.id}/students`}>Manage Students</Link>
                </Button>
                <Button variant="link" className="text-primary hover:underline" asChild>
                  <Link to={`/lecturer/courses/${course.id}/sessions`}>Sessions</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CourseList;
