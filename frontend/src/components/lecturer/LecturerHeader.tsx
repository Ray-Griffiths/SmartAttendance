import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { UserProfile } from "@/services/lecturerApi"; // <- import type from API service

interface LecturerHeaderProps {
  onLogout?: () => void;
}

/**
 * LecturerHeader
 * - Fetches lecturer profile
 * - Shows name and avatar placeholder
 * - Handles logout with toast feedback
 */
const LecturerHeader: React.FC<LecturerHeaderProps> = ({ onLogout }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch lecturer profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const res = await axios.get<UserProfile>(
          `${import.meta.env.VITE_API_URL || ""}/api/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUser(res.data);
      } catch (err: any) {
        console.error("Profile fetch failed:", err);
        toast.error("Session expired, please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    toast.info("Logging out...");
    localStorage.removeItem("token");
    onLogout?.();
    navigate("/login");
  };

  if (loading) {
    return (
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
        <h1 className="text-lg font-semibold text-primary">SmartAttendance</h1>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
      <h1 className="text-lg font-semibold text-primary select-none">
        SmartAttendance
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-1 hover:bg-accent rounded-lg"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="text-sm font-medium truncate max-w-[120px]">
              {user?.name || "Lecturer"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default LecturerHeader;
