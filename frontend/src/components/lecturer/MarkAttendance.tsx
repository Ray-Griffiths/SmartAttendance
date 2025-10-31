import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { markAttendance } from "@/services/lecturerApi"; // ✅ Use lecturerApi
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Lecturer MarkAttendance Component
 * - Uses QR scan + geolocation for verification
 * - Communicates with lecturerApi.ts
 * - Updates dashboard in real-time via WebSocket
 */
interface MarkAttendanceProps {
  sessionId?: string | null;
  onMarked?: (recordId: string) => void;
}

const MarkAttendance: React.FC<MarkAttendanceProps> = ({ sessionId, onMarked }) => {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [showQR, setShowQR] = useState(!sessionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [derivedSessionId, setDerivedSessionId] = useState<string | null>(sessionId ?? null);
  const socketRef = useRef<WebSocket | null>(null);

  /** Connect to WebSocket for real-time updates */
  useEffect(() => {
    if (!derivedSessionId) return;
    const socketUrl = `${import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000"}/ws/attendance/${derivedSessionId}`;
    const ws = new WebSocket(socketUrl);

    ws.onopen = () => console.log("[WebSocket] Connected to attendance session");
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data?.type === "attendance_update") {
        toast.info(`New attendance record: ${data.studentName ?? data.studentId}`);
        onMarked?.(data.recordId);
      }
    };
    ws.onerror = (err) => console.error("[WebSocket] Error:", err);
    ws.onclose = () => console.log("[WebSocket] Disconnected");

    socketRef.current = ws;
    return () => ws.close();
  }, [derivedSessionId, onMarked]);

  /** QR Scanner handler */
  const handleQRScan = (detectedCodes: IDetectedBarcode[]) => {
    if (!detectedCodes.length) return;
    const code = detectedCodes[0].rawValue;
    try {
      const url = new URL(code);
      const qrUuid = url.pathname.split("/").pop();
      if (qrUuid) {
        setDerivedSessionId(qrUuid);
        setStatus("QR code scanned successfully");
        setShowQR(false);
      } else {
        throw new Error("Invalid QR code format");
      }
    } catch {
      toast.error("Invalid QR code");
      setStatus("Failed to parse QR code");
    }
  };

  /** Get lecturer location */
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return setStatus("Geolocation is not supported by your browser");
    }

    setStatus("Requesting location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords);
        setStatus("Location captured successfully");
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow access."
            : "Failed to capture location.";
        toast.error(msg);
        setStatus(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /** Submit attendance to API */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return toast.error("Index number is required");
    if (!coords) return toast.error("Geolocation is required");
    if (!derivedSessionId) return toast.error("Session not available");

    setIsSubmitting(true);
    setStatus("Submitting attendance...");

    try {
      const payload = {
        studentId,
        method: "qr",
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        },
        timestamp: new Date().toISOString(),
      };

      const rec = await markAttendance(derivedSessionId, payload);
      toast.success(`Attendance marked for ${studentId}`);
      setStatus(`Attendance marked successfully for ${studentId}`);

      // Broadcast locally for instant feedback
      socketRef.current?.send(
        JSON.stringify({ type: "attendance_update", recordId: rec.id, studentId })
      );

      onMarked?.(rec.id);
      setStudentId("");
      setCoords(null);
      setShowQR(!sessionId);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to submit attendance";
      toast.error(errorMsg);
      setStatus(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Auto-request geolocation on mount */
  useEffect(() => {
    if (navigator.geolocation && !coords) requestGeolocation();
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Mark Attendance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Session:{" "}
          <span className="font-medium">
            {derivedSessionId ?? "Scan QR to select session"}
          </span>
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {/* QR Modal */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              key="qr-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              role="dialog"
              aria-labelledby="qr-modal-title"
              aria-modal="true"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-xl p-4 shadow-xl w-[90%] max-w-md text-center"
              >
                <h3 id="qr-modal-title" className="text-lg font-semibold mb-3">
                  Scan Session QR
                </h3>
                <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
                  <Scanner
                    onScan={handleQRScan}
                    onError={(err) => {
                      console.error(err);
                      toast.error("QR scanner error");
                    }}
                    constraints={{ facingMode: "environment" }}
                  />
                </div>
                <Button variant="outline" onClick={() => setShowQR(false)}>
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attendance Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="studentId" className="text-sm font-medium text-gray-700">
              Student Index Number
            </label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter student index number"
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={requestGeolocation}
              disabled={isSubmitting}
              variant="outline"
            >
              {coords ? "✅ Location Captured" : "Allow Location"}
            </Button>
            {sessionId && (
              <Button
                type="button"
                onClick={() => setShowQR(true)}
                disabled={isSubmitting}
                variant="outline"
              >
                Scan QR
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !coords || !studentId.trim() || !derivedSessionId}
            >
              Submit Attendance
            </Button>
          </div>
        </form>

        {/* Status */}
        <AnimatePresence>
          {status && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="mt-4 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
              role="alert"
            >
              {status}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default MarkAttendance;
