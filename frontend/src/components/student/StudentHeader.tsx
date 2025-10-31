import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Menu, User, BookOpen, Calendar, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import { getStudentProfile } from "@/services/studentApi"; // ✅ Use centralized API

interface StudentProfile {
  id: string;
  name: string;
}

const StudentHeader: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Fetch student profile using studentApi helper
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getStudentProfile();
        setProfile(data);
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        toast.error("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/auth/login");
  };

  // Toggle theme
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const userDisplay = loading ? "Loading..." : profile?.name || "Student";

  const navLinks = [
    { to: "/student", label: "Dashboard", icon: <Calendar className="h-4 w-4" /> },
    { to: "/student/courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/student/attendance", label: "Attendance", icon: <User className="h-4 w-4" /> },
    { to: "/student/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link to="/student" className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">SmartAttendance</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Button key={link.to} variant="ghost" asChild>
              <Link to={link.to} className="flex items-center gap-2">
                {link.icon} {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userDisplay}</span>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col gap-4 mt-4">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="flex items-center gap-2 text-foreground">
                    {link.icon} {link.label}
                  </Link>
                ))}
                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground mb-4">{userDisplay}</div>
                  <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="mb-4">
                    {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={handleLogout} className="w-full">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
