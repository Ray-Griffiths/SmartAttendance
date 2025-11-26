import React, { useState, useEffect, useMemo } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Trash2, Edit2, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import CourseAnalyticsChart from "./common/CourseAnalyticsChart";
import { getCourses, getUsers, createCourse, updateCourse, deleteCourse, Course, User } from "@/services/adminApi";
import toast, { Toaster } from "react-hot-toast";

interface CourseWithLecturer extends Course {
  lecturer?: string; // derived from lecturerId
  isEditing?: boolean; // local UI state
}

const ManageCourses: React.FC = () => {
  const [courses, setCourses] = useState<CourseWithLecturer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newCourse, setNewCourse] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<"name" | "lecturer">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Fetch courses + users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, usersData] = await Promise.all([getCourses(), getUsers()]);
        setUsers(usersData);

        const mappedCourses: CourseWithLecturer[] = coursesData.map((c) => ({
          ...c,
          lecturer: usersData.find((u) => u.id === c.lecturerId)?.name ?? "Unassigned",
        }));

        setCourses(mappedCourses);
      } catch (err) {
        console.error("Failed to fetch courses or users", err);
        toast.error("Failed to fetch courses or users");
      }
    };
    fetchData();
  }, []);

  // Add new course
  const addCourse = async () => {
    const trimmed = newCourse.trim();
    if (!trimmed) {
      toast.error("Course name cannot be empty");
      return;
    }
    try {
      const created = await createCourse({ name: trimmed });
      setCourses([...courses, { ...created, lecturer: "Unassigned" }]);
      setNewCourse("");
      toast.success("Course added successfully");
    } catch (err) {
      console.error("Failed to add course", err);
      toast.error("Failed to add course");
    }
  };

  // Delete course
  const removeCourse = async (id: string) => {
    try {
      await deleteCourse(id);
      setCourses(courses.filter((c) => c.id !== id));
      toast.success("Course deleted successfully");
    } catch (err) {
      console.error("Failed to delete course", err);
      toast.error("Failed to delete course");
    }
  };

  // Edit lecturer
  const startEditing = (id: string) =>
    setCourses(courses.map((c) => (c.id === id ? { ...c, isEditing: true } : c)));

  const saveLecturer = async (id: string, lecturerName: string) => {
    try {
      const user = users.find((u) => u.name === lecturerName);
      const lecturerId: string | undefined = user?.id ?? undefined;
      // Send update to backend (adapter will map lecturerId -> lecturer_id)
      await updateCourse(id, { lecturerId });
      // Backend returns only a message by default; update local UI state directly
      setCourses(
        courses.map((c) => (c.id === id ? { ...c, lecturer: lecturerName, isEditing: false } : c))
      );
      toast.success("Lecturer updated successfully");
    } catch (err) {
      console.error("Failed to update lecturer", err);
      toast.error("Failed to update lecturer");
    }
  };

  const cancelEditing = (id: string) =>
    setCourses(courses.map((c) => (c.id === id ? { ...c, isEditing: false } : c)));

  // Sorting
  const handleSort = (column: "name" | "lecturer") => {
    if (sortColumn === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Filter + sort + paginate
  const filteredCourses = useMemo(() => {
    const filtered = courses.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.lecturer?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const valA = (a[sortColumn] ?? "").toLowerCase();
      const valB = (b[sortColumn] ?? "").toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [courses, searchTerm, sortColumn, sortOrder]);

  const totalPages = Math.ceil(filteredCourses.length / pageSize);
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Analytics
  const totalCourses = courses.length;
  const assignedLecturers = courses.filter((c) => c.lecturer && c.lecturer !== "Unassigned").length;
  const unassignedLecturers = totalCourses - assignedLecturers;

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Manage Courses</h2>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 shadow rounded text-center hover:shadow-lg">
          <p className="text-gray-500 dark:text-gray-400">Total Courses</p>
          <p className="text-2xl font-bold">{totalCourses}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 shadow rounded text-center hover:shadow-lg">
          <p className="text-gray-500 dark:text-gray-400">Assigned Lecturers</p>
          <p className="text-2xl font-bold text-green-600">{assignedLecturers}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 shadow rounded text-center hover:shadow-lg">
          <p className="text-gray-500 dark:text-gray-400">Unassigned Lecturers</p>
          <p className="text-2xl font-bold text-red-600">{unassignedLecturers}</p>
        </div>
      </div>

      {/* Course Analytics Chart */}
      <CourseAnalyticsChart courses={filteredCourses} />

      {/* Add + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
        <Input
          value={newCourse}
          onChange={(e) => setNewCourse(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCourse()}
          placeholder="New course name"
          aria-label="New course name"
          className="flex-1"
        />
        <Button onClick={addCourse} variant="default" aria-label="Add course" className="bg-blue-600 text-white hover:bg-blue-700">
          Add
        </Button>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search courses..."
          aria-label="Search courses"
          className="flex-1 mt-2 sm:mt-0"
        />
      </div>

      {/* Courses Table */}
      <div className="overflow-x-auto border rounded shadow-sm bg-white dark:bg-gray-900">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort("name")}>
                Course {sortColumn === "name" && (sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
              </th>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort("lecturer")}>
                Lecturer {sortColumn === "lecturer" && (sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
              </th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCourses.length ? (
              paginatedCourses.map((course) => (
                <tr key={course.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="p-2">{course.name}</td>
                  <td className="p-2">
                    {course.isEditing ? (
                      <input
                        type="text"
                        defaultValue={course.lecturer}
                        className="border rounded px-2 py-1 w-full transition-colors focus:outline-none focus:ring focus:ring-indigo-300"
                        aria-label={`Edit lecturer for ${course.name}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLecturer(course.id, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") cancelEditing(course.id);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span>{course.lecturer}</span>
                    )}
                  </td>
                  <td className="p-2 flex gap-2">
                    {course.isEditing ? (
                      <>
                        <Button onClick={() => saveLecturer(course.id, course.lecturer ?? "")} size="sm" variant="default" aria-label="Save lecturer">
                          <Check size={16} />
                        </Button>
                        <Button onClick={() => cancelEditing(course.id)} size="sm" variant="default" aria-label="Cancel edit">
                          <X size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEditing(course.id)} size="sm" variant="secondary" aria-label="Edit lecturer">
                          <Edit2 size={16} />
                        </Button>
                        <Button onClick={() => removeCourse(course.id)} size="sm" variant="destructive" aria-label="Delete course">
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No courses available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} variant="secondary" size="sm">
            Previous
          </Button>
          <span className="flex items-center px-2">Page {currentPage} of {totalPages}</span>
          <Button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} variant="secondary" size="sm">
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
