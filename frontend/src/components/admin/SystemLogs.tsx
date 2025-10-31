import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Loader2, Search, Filter, Download, CalendarDays } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getSystemLogs, SystemLog as ApiSystemLog } from "@/services/adminApi"; // <- API import
import toast, { Toaster } from "react-hot-toast";

// StatsCard interface and component (same as before)
interface StatsCardProps {
  title: string;
  value: number;
  accentColor: "gray" | "blue" | "green" | "purple" | string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, accentColor }) => {
  const colorMap = {
    gray: "text-gray-600 border-gray-200 bg-gray-50",
    blue: "text-blue-600 border-blue-200 bg-blue-50",
    green: "text-green-600 border-green-200 bg-green-50",
    purple: "text-purple-600 border-purple-200 bg-purple-50",
  };
  const bgColor = colorMap[accentColor as keyof typeof colorMap] || colorMap.gray;

  return (
    <Card className={`border-l-4 ${bgColor}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
};

const PAGE_SIZE = 10;

export default function SystemLogs(): JSX.Element {
  const [logs, setLogs] = useState<ApiSystemLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | ApiSystemLog["type"]>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await getSystemLogs();
        setLogs(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch system logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => filter === "all" || log.type === filter)
      .filter((log) => log.action.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((log) => {
        const logDate = new Date(log.date).setHours(0, 0, 0, 0);
        const afterFrom = fromDate ? logDate >= new Date(fromDate).setHours(0, 0, 0, 0) : true;
        const beforeTo = toDate ? logDate <= new Date(toDate).setHours(23, 59, 59, 999) : true;
        return afterFrom && beforeTo;
      });
  }, [logs, filter, searchTerm, fromDate, toDate]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Analytics counts
  const totalLogs = logs.length;
  const userMgmtLogs = logs.filter((l) => l.type === "User Management").length;
  const attendanceLogs = logs.filter((l) => l.type === "Attendance").length;
  const systemLogs = logs.filter((l) => l.type === "System").length;

  const pieData = [
    { name: "User Management", value: userMgmtLogs },
    { name: "Attendance", value: attendanceLogs },
    { name: "System", value: systemLogs },
  ];
  const COLORS = ["#3b82f6", "#22c55e", "#a855f7"]; // Blue, Green, Purple

  const exportToCSV = () => {
    const headers = ["User", "Action", "Type", "Date"];
    const rows = filteredLogs.map((log) => [
      log.user,
      log.action,
      log.type,
      new Date(log.date).toLocaleString(),
    ]);

    const csvContent =
  "data:text/csv;charset=utf-8," +
  [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${(cell ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2
          role="status"
          aria-label="Loading..."
          className="animate-spin w-8 h-8 text-gray-500"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">System Logs Dashboard</h1>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Logs" value={totalLogs} accentColor="gray" />
        <StatsCard title="User Management" value={userMgmtLogs} accentColor="blue" />
        <StatsCard title="Attendance" value={attendanceLogs} accentColor="green" />
        <StatsCard title="System" value={systemLogs} accentColor="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Log Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <CardTitle>Detailed Logs</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Filter className="absolute left-2 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    className="border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value as typeof filter);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter logs by type"
                  >
                    <option value="all">All Logs</option>
                    <option value="Attendance">Attendance</option>
                    <option value="User Management">User Management</option>
                    <option value="System">System</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="text-gray-500 w-4 h-4" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="From date"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="To date"
                  />
                </div>

                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="border rounded-md pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Search logs"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={exportToCSV}
                >
                  <Download size={16} /> Export
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table
                className="min-w-full text-sm table-auto"
                aria-label="System logs table"
              >
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="py-2 px-4 text-left">User</th>
                    <th className="py-2 px-4 text-left">Action</th>
                    <th className="py-2 px-4 text-left">Type</th>
                    <th className="py-2 px-4 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4 font-medium">{log.user}</td>
                        <td className="py-2 px-4">{log.action}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              log.type === "System"
                                ? "bg-gray-200 text-gray-800"
                                : log.type === "Attendance"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-600">
                          {new Date(log.date).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">
                        No logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <span className="text-sm text-gray-600">
                  Showing logs {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <div className="flex gap-2 items-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
