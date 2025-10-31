import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, BookOpen, Calendar, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getStudentProfile } from "@/services/studentApi";

interface StudentProfile {
  id: string;
  name: string;
  email?: string; // Include optional email if needed
}

const StudentSidebar: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch student profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getStudentProfile();
        setProfile(data || null);
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
    navigate("/");
    setIsOpen(false); // Close mobile menu on logout
  };

  // Determine active link
  const isActive = (path: string) => location.pathname === path;

  // Shared sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <Calendar className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">SmartAttendance</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Button variant={isActive("/student") ? "default" : "ghost"} asChild className="w-full justify-start">
          <Link to="/student" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <Calendar className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button variant={isActive("/student/courses") ? "default" : "ghost"} asChild className="w-full justify-start">
          <Link to="/student/courses" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <BookOpen className="h-4 w-4" />
            Courses
          </Link>
        </Button>
        <Button variant={isActive("/student/attendance") ? "default" : "ghost"} asChild className="w-full justify-start">
          <Link to="/student/attendance" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <User className="h-4 w-4" />
            Attendance
          </Link>
        </Button>
        <Button variant={isActive("/student/profile") ? "default" : "ghost"} asChild className="w-full justify-start">
          <Link to="/student/profile" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <User className="h-4 w-4" />
            Profile
          </Link>
        </Button>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="text-sm text-muted-foreground mb-4">
          {loading ? "Loading..." : profile ? profile.name : "Student"}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          className="w-full mb-4 justify-center"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <Button variant="outline" onClick={handleLogout} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-background border-r border-border shadow-sm h-screen fixed top-0 left-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-r border-border bg-background">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default StudentSidebar;
