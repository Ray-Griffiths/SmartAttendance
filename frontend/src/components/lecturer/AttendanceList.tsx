import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getAttendanceBySession,
  AttendanceRecord as APIAttendanceRecord,
} from "@/services/lecturerApi";

interface AttendanceListProps {
  sessionId?: string | null;
}

const AttendanceList: React.FC<AttendanceListProps> = ({ sessionId = null }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<APIAttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "timestamp">("timestamp");
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch attendance records
  const fetchAttendance = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceBySession(sessionId);

      const sortedRecords = [...(data || [])].sort((a, b) => {
        if (sortBy === "name") return a.studentName!.localeCompare(b.studentName!);
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setRecords(sortedRecords);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load attendance";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("No authentication token found");
      toast.error("No authentication token found");
      return;
    }

    const wsBase = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:5000";
    const wsUrl = `${wsBase}/api/attendance/ws/${sessionId}?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WebSocket connected for session:", sessionId);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const newRecord: APIAttendanceRecord = JSON.parse(event.data);
        setRecords((prevRecords) => {
          if (prevRecords.some((r) => r.id === newRecord.id)) return prevRecords;
          const updatedRecords = [...prevRecords, newRecord].sort((a, b) => {
            if (sortBy === "name") return a.studentName!.localeCompare(b.studentName!);
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          toast.success(`New attendance recorded for ${newRecord.studentName}`);
          return updatedRecords;
        });
      } catch (err) {
        console.error("WebSocket message parsing error:", err);
        toast.error("Failed to process attendance update");
      }
    };

    wsRef.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("Failed to connect to real-time updates");
      toast.error("Failed to connect to real-time updates");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected for session:", sessionId);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, sortBy]);

  // Fetch initial attendance records
  useEffect(() => {
    let mounted = true;
    if (mounted) fetchAttendance();
    return () => {
      mounted = false;
    };
  }, [sessionId, sortBy]);

  // Retry handler
  const handleRetry = () => fetchAttendance();

  // Toggle sort order
  const toggleSort = () =>
    setSortBy(sortBy === "name" ? "timestamp" : "name");

  if (!sessionId) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Select a session to view attendance.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Loading attendance...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!records.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            No attendance recorded for this session.
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link to="/lecturer/sessions">Manage Sessions</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            Attendance ({records.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={toggleSort}>
            Sort by {sortBy === "name" ? "Timestamp" : "Name"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {records.map((record) => (
            <li
              key={record.id}
              className="py-3 flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-foreground">
                  {record.studentName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {record.studentRegNo ?? "N/A"}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(record.timestamp).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default AttendanceList;
