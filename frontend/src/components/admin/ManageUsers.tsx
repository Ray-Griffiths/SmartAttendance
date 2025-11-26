import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  GraduationCap, 
  Shield, 
  Edit2, 
  Trash2, 
  Search,
  ChevronDown,
  ChevronUp,
  Loader2
} from "lucide-react";
import { StatsCard } from "./common/StatsCard";
import UserRoleChart from "./common/UserRoleChart";
import { getUsers, createUser, updateUser, deleteUser, User } from "@/services/adminApi";
import toast, { Toaster } from "react-hot-toast";

interface UserWithEditing extends User {
  isEditing?: boolean;
}

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<UserWithEditing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<User["role"]>("Student");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const pageSize = 8;

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsers();
        const normalized = data.map((u: any) => ({
          ...u,
          role: u.role || "Student",
        }));
        setUsers(normalized);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Add new user
  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    try {
      const created = await createUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      });
      setUsers([...users, { ...created, role: created.role || "Student" }]);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("Student");
      setIsAddFormOpen(false);
      toast.success("User added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add user");
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      toast.success("User deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    }
  };

  // Edit role
  const startEditing = (id: string) =>
    setUsers(users.map((u) => (u.id === id ? { ...u, isEditing: true } : u)));

  const saveRole = async (id: string, role: User["role"]) => {
    try {
      const updated = await updateUser(id, { role });
      setUsers(
        users.map((u) =>
          u.id === id ? { ...updated, role: updated.role || "Student", isEditing: false } : u
        )
      );
      toast.success("Role updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    }
  };

  const cancelEditing = (id: string) =>
    setUsers(users.map((u) => (u.id === id ? { ...u, isEditing: false } : u)));

  // Filter + Pagination
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.role?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Analytics
  const totalUsers = users.length;
  const lecturersCount = users.filter((u) => u.role === "Lecturer").length;
  const studentsCount = users.filter((u) => u.role === "Student").length;
  const adminsCount = users.filter((u) => u.role === "Admin").length;

  // Role badge component
  const RoleBadge = ({ role }: { role: User["role"] }) => {
    const variants = {
      Student: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: GraduationCap },
      Lecturer: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: UserCheck },
      Admin: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Shield },
    };

    const { color, icon: Icon } = variants[role] || variants.Student;

    return (
      <Badge variant="secondary" className={`font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {role}
      </Badge>
    );
  };

  // Avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/30 p-4 md:p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Manage Users
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add, edit, and manage all system users
            </p>
          </div>
          <Button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add New User
            {isAddFormOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Collapsible Add Form */}
        {isAddFormOpen && (
          <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <CardTitle className="text-xl">Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Full Name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="col-span-1"
                />
                <Input
                  placeholder="Email Address"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  type="email"
                  className="col-span-1"
                />
                <Select value={newUserRole} onValueChange={(v: User["role"]) => setNewUserRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-3">
                  <Button onClick={handleAddUser} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Create User
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddFormOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Users" value={totalUsers} icon={Users} gradient="from-blue-500 to-cyan-500" />
          <StatsCard title="Lecturers" value={lecturersCount} icon={UserCheck} gradient="from-blue-500 to-blue-600" />
          <StatsCard title="Students" value={studentsCount} icon={GraduationCap} gradient="from-green-500 to-emerald-500" />
          <StatsCard title="Admins" value={adminsCount} icon={Shield} gradient="from-purple-500 to-indigo-500" />
        </div>

        {/* Role Distribution Chart */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <UserRoleChart lecturers={lecturersCount} students={studentsCount} admins={adminsCount} />
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <span className="ml-3 text-lg">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl">No users found</p>
                <p className="text-sm mt-2">
                  {searchTerm ? "Try adjusting your search" : "Start by adding your first user"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-all duration-200"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-white shadow-lg">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                  {getInitials(user.name || "U")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">{user.email}</TableCell>
                          <TableCell>
                            {user.isEditing ? (
                              <Select
                                defaultValue={user.role}
                                onValueChange={(v) => saveRole(user.id, v as User["role"])}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Student">Student</SelectItem>
                                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <RoleBadge role={user.role || "Student"} />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.isEditing ? (
                                <Button size="sm" variant="ghost" onClick={() => cancelEditing(user.id)}>
                                  Cancel
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditing(user.id)}
                                    className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + Math.max(1, currentPage - 2);
                        if (page > totalPages) return null;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageUsers;