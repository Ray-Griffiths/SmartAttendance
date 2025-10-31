import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Loader2, AlertCircle, RefreshCw, UserPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  getCourseStudents,
  addStudentToCourse,
  importStudentsCsv,
} from "@/services/lecturerApi";

interface StudentSummary {
  id: string;
  name: string;
  indexNumber: string;
}

// ✅ Validation schema
const studentSchema = z.object({
  indexNumber: z.string().min(5, "Index number must be at least 5 characters"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

const StudentManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      indexNumber: "",
    },
  });

  // ✅ Fetch students via lecturerApi
  const fetchStudents = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCourseStudents(courseId);
      setStudents(res || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to load students";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add a student to a course
  const handleAddStudent = async (data: StudentFormValues) => {
    if (!courseId) return;
    try {
      const newStudent = await addStudentToCourse(courseId, data.indexNumber);
      setStudents((prev) => [...prev, newStudent]);
      toast.success(`Student "${newStudent.name}" added to course`);
      setIsDialogOpen(false);
      form.reset();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to add student";
      toast.error(errorMessage);
    }
  };

  // ✅ Handle CSV import
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !courseId) return;

    try {
      const newStudents = await importStudentsCsv(courseId, file);
      setStudents((prev) => [...prev, ...newStudents]);
      toast.success(`${newStudents.length} students imported successfully`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to import students";
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Loading students...</p>
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
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchStudents}>
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
          <CardTitle className="text-lg font-semibold">Manage Students</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Student to Course</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddStudent)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="indexNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Index Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ST12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Student
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Button asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvImport}
                />
              </label>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {students.length ? (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {students.map((student) => (
              <li
                key={student.id}
                className="p-3 bg-background rounded-md border border-border flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-foreground">{student.name}</div>
                  <div className="text-xs text-muted-foreground">{student.indexNumber}</div>
                </div>
                <Button
                  variant="link"
                  className="text-primary hover:underline"
                  asChild
                >
                  <Link to={`/lecturer/attendance/student/${student.id}`}>View Attendance</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No students enrolled in this course yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentManagementPage;
