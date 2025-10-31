import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  User,
  Eye,
  Filter,
  Mail,
  Phone,
  BookOpen,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { getStudentsByCourse } from "@/services/lecturerApi"; // ✅ Import API

export interface StudentSummary {
  id: string;
  name: string;
  regNo?: string;
  course?: string;
  email?: string;
  phone?: string;
}

interface StudentListProps {
  courseId?: string; // ✅ Added optional courseId for API fetch
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
  const [selectedFilter, setSelectedFilter] = useState<string>("");
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =============================
  // 🧩 Fetch Students by Course
  // =============================
  useEffect(() => {
    if (!courseId) return;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStudentsByCourse(courseId);
        setStudents(data || []);
      } catch (err: any) {
        console.error("Failed to fetch students:", err);
        setError("Could not load students. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [courseId]);

  // =============================
  // 🔍 Filtering Logic
  // =============================
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.regNo?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = selectedFilter
        ? s.course === selectedFilter
        : true;
      return matchSearch && matchFilter;
    });
  }, [students, search, selectedFilter]);

  // =============================
  // 🧱 Render
  // =============================
  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name or Reg No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filterOptions.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-1/3">
            <Filter className="text-gray-400 w-4 h-4" />
            <Select
              value={selectedFilter}
              onValueChange={(val) => setSelectedFilter(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Courses</SelectItem>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex justify-center py-10 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading students...
        </div>
      )}

      {error && (
        <Card className="p-6 text-center border border-red-200 bg-red-50">
          <CardContent>
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {!loading && !error && filteredStudents.length === 0 ? (
        <Card className="p-6 text-center border border-dashed border-gray-300 shadow-sm">
          <CardContent>
            <p className="text-gray-500 text-sm">No matching students found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((s, index) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{s.name}</div>
                      <div className="text-sm text-gray-500">
                        {s.regNo ?? "—"}{" "}
                        {s.course && (
                          <span className="ml-2 text-xs text-blue-500">
                            {s.course}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Student Details
            </DialogTitle>
            <DialogDescription>
              View complete information about the student.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-3 mt-3">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{selectedStudent.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Registration No</p>
                <p className="font-medium">{selectedStudent.regNo ?? "N/A"}</p>
              </div>

              {selectedStudent.course && (
                <div>
                  <p className="text-sm text-gray-500">Course</p>
                  <p className="font-medium flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    {selectedStudent.course}
                  </p>
                </div>
              )}

              {selectedStudent.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-blue-500" />
                    {selectedStudent.email}
                  </p>
                </div>
              )}

              {selectedStudent.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-blue-500" />
                    {selectedStudent.phone}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
            {selectedStudent && (
              <Button
                onClick={() => {
                  onSelect?.(selectedStudent.id);
                  setSelectedStudent(null);
                }}
              >
                View Attendance
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentList;
