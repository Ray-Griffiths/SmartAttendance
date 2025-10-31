import React, { useState, useEffect, useMemo } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Users, UserPlus, UserCheck, Edit2, Trash2, X } from "lucide-react";
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
  const pageSize = 5;

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch users");
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
      const created = await createUser({ name: newUserName, email: newUserEmail, role: newUserRole });
      setUsers([...users, created]);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("Student");
      toast.success("User added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add user");
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success("User deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    }
  };

  // Edit role
  const startEditing = (id: string) => setUsers(users.map(u => u.id === id ? { ...u, isEditing: true } : u));

  const saveRole = async (id: string, role: User["role"]) => {
    try {
      const updated = await updateUser(id, { role });
      setUsers(users.map(u => u.id === id ? { ...updated, isEditing: false } : u));
      toast.success("User role updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    }
  };

  const cancelEditing = (id: string) => setUsers(users.map(u => u.id === id ? { ...u, isEditing: false } : u));

  // Filter + paginate
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Analytics
  const totalUsers = users.length;
  const lecturersCount = users.filter(u => u.role === "Lecturer").length;
  const studentsCount = users.filter(u => u.role === "Student").length;
  const adminsCount = users.filter(u => u.role === "Admin").length;

  const roleColor = (role: User["role"]) => {
    switch (role) {
      case "Lecturer": return "text-blue-600";
      case "Student": return "text-green-600";
      case "Admin": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Manage Users</h2>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={totalUsers} icon={Users} />
        <StatsCard title="Lecturers" value={lecturersCount} icon={UserCheck} accentColor="blue" />
        <StatsCard title="Students" value={studentsCount} icon={UserPlus} accentColor="green" />
        <StatsCard title="Admins" value={adminsCount} icon={Users} accentColor="purple" />
      </div>

      {/* Chart */}
      <UserRoleChart lecturers={lecturersCount} students={studentsCount} admins={adminsCount} />

      {/* Add + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 mt-4">
        <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Full Name" className="flex-1" />
        <Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email address" className="flex-1" />
        <div>
          <label htmlFor="newUserRole" className="sr-only">Select role</label>
          <select
            id="newUserRole"
            value={newUserRole}
            onChange={e => setNewUserRole(e.target.value as User["role"])}
            className="border rounded px-2 py-1"
          >
            <option value="Student">Student</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <Button onClick={handleAddUser} variant="default" className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
          <UserPlus size={16} /> Add
        </Button>
        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..." className="flex-1 mt-2 sm:mt-0" />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border rounded mt-4 shadow-sm bg-white dark:bg-gray-900">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length > 0 ? paginatedUsers.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  {user.isEditing ? (
                    <div className="flex gap-2 items-center">
                      <label htmlFor={`editRole-${user.id}`} className="sr-only">Edit role</label>
                      <select
                        id={`editRole-${user.id}`}
                        value={user.role}
                        onChange={e => saveRole(user.id, e.target.value as User["role"])}
                        className="border rounded px-2 py-1"
                        autoFocus
                      />
                      <Button size="sm" variant="secondary" onClick={() => cancelEditing(user.id)} className="bg-gray-400 text-white hover:bg-gray-500">
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <span className={roleColor(user.role)}>{user.role}</span>
                  )}
                </td>
                <td className="p-3 text-center flex justify-center gap-2">
                  {!user.isEditing && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => startEditing(user.id)} className="bg-yellow-500 text-white hover:bg-yellow-600">
                        <Edit2 size={16} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)} className="bg-red-600 text-white hover:bg-red-700">
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">No users available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} variant="secondary" className="bg-gray-400 text-white hover:bg-gray-500">Previous</Button>
          <span className="flex items-center px-2">Page {currentPage} of {totalPages}</span>
          <Button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} variant="secondary" className="bg-gray-400 text-white hover:bg-gray-500">Next</Button>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
