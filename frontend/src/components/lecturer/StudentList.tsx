import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Eye,
  Filter,
  Mail,
  Phone,
  BookOpen,
  Users,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentsByCourse } from "@/services/lecturerApi";

export interface StudentSummary {
  id: string;
  name: string;
  regNo?: string;
  course?: string;
  email?: string;
  phone?: string;
}

interface StudentListProps {
  courseId?: string;
  onSelect?: (studentId: string) => void;
  filterOptions?: string[];
}

const StudentList: React.FC<StudentListProps> = ({
  courseId,
  onSelect,
  filterOptions = [],
}) => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch students
  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStudentsByCourse(courseId);
        setStudents(data || []);
      } catch (err: any) {
        console.error("Failed to fetch students:", err);
        setError("Failed to load students. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [courseId]);

  // Filtering logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.regNo?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        selectedFilter === "all" || student.course === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [students, search, selectedFilter]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Students
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? "Loading students..."
              : `${filteredStudents.length} of ${students.length} student${students.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-80 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          {filterOptions.length > 0 && (
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {filterOptions.map((course) => (
                  <SelectItem key={course} value={course}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-10 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-red-700 font-medium">Oops! Something went wrong</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filteredStudents.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No students found</h3>
            <p className="text-sm text-gray-500 mt-2">
              {search || selectedFilter !== "all"
                ? "Try adjusting your search or filter."
                : "There are no students enrolled in this course yet."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {!loading && !error && filteredStudents.length > 0 && (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Card
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-200 hover:border-blue-300"
                  onClick={() => setSelectedStudent(student)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 ring-2 ring-white shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="font-mono">{student.regNo || "—"}</span>
                            {student.course && (
                              <>
                                <span className="text-gray-400">•</span>
                                <Badge variant="secondary" className="text-xs">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {student.course}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Student Details Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                  {selectedStudent && getInitials(selectedStudent.name)}
                </AvatarFallback>
              </Avatar>
              {selectedStudent?.name}
            </DialogTitle>
            <DialogDescription>
              Student profile and contact information
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Registration Number</p>
                  <p className="font-mono text-lg">{selectedStudent.regNo || "—"}</p>
                </div>

                {selectedStudent.course && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Course</p>
                    <Badge variant="outline" className="text-sm">
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      {selectedStudent.course}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                {selectedStudent.email && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedStudent.email}</p>
                    </div>
                  </div>
                )}

                {selectedStudent.phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedStudent.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <Button variant="outline" onClick={() => setSelectedStudent(null)} className="w-full sm:w-auto">
              Close
            </Button>
            {selectedStudent && onSelect && (
              <Button
                onClick={() => {
                  onSelect(selectedStudent.id);
                  setSelectedStudent(null);
                }}
                className="w-full sm:w-auto"
              >
                View Attendance Records
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentList;``