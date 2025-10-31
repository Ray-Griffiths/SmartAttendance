import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Book,
  Calendar,
  FileText,
  Settings,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User, Course } from "@/services/adminApi";

/**
 * Admin Sidebar (Responsive + Collapsible)
 * - Full sidebar on hover for desktop
 * - Toggle open/close for mobile
 * - Dynamic active styles for better accessibility
 */
const AdminSidebar: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Desktop mini mode

  // Sidebar links
  const links: { to: string; icon: React.ReactNode; label: string }[] = [
    { to: "/admin/dashboard", icon: <Home size={18} />, label: "Dashboard" },
    { to: "/admin/users", icon: <Users size={18} />, label: "Manage Users" },
    { to: "/admin/courses", icon: <Book size={18} />, label: "Manage Courses" },
    { to: "/admin/attendance", icon: <Calendar size={18} />, label: "Attendance" },
    { to: "/admin/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
    { to: "/admin/logs", icon: <FileText size={18} />, label: "System Logs" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-md shadow-md"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isMobileOpen}
        variant="ghost"
      >
        {isMobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </Button>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800 transition-all duration-300 z-40
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        role="navigation"
        aria-label="Admin sidebar navigation"
      >
        {/* Header */}
        <div
          className={`py-6 text-center border-b border-gray-800 transition-all duration-300 ${
            isCollapsed ? "opacity-0 lg:opacity-0 h-0 lg:h-0" : "opacity-100"
          }`}
        >
          <h2 className="text-xl font-semibold tracking-wide text-white">
            SmartAttendance
          </h2>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 lg:px-4 py-6 space-y-2 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
              aria-label={link.label}
            >
              {link.icon}
              {!isCollapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="py-3 text-center text-xs text-gray-500 border-t border-gray-800">
            © 2025 SmartAttendance
          </div>
        )}
      </aside>

      {/* Dimmed Overlay for Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={() => setIsMobileOpen(false)}
          role="button"
          aria-label="Close sidebar"
        />
      )}
    </>
  );
};

export default AdminSidebar;
