import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getStudentsByCourse, addStudentToCourse, previewImportStudents, importStudentsCsv, exportStudents } from "@/services/lecturerApi";
import ImportPreviewDialog from "./ImportPreviewDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string | null;
  onUpdated?: () => void;
}

const StudentManagementDialog: React.FC<Props> = ({ open, onOpenChange, courseId, onUpdated }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [newIndex, setNewIndex] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !courseId) return;
    fetchStudents();
  }, [open, courseId]);

  const fetchStudents = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await getStudentsByCourse(courseId);
      setStudents(res || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!courseId) return toast.error("No course selected");
    if (!newIndex.trim()) return toast.error("Index is required");
    try {
      await addStudentToCourse(courseId, newIndex.trim());
      toast.success("Student added");
      setNewIndex("");
      fetchStudents();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add student");
    }
  };

  const handleFileChange = async (file: File | null) => {
    setCsvFile(file);
    if (!file || !courseId) return;
    try {
      const pv = await previewImportStudents(courseId, file);
      setPreview(pv);
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to preview import");
    }
  };

  const handleConfirmImport = async () => {
    if (!csvFile || !courseId) return;
    try {
      const res = await importStudentsCsv(courseId, csvFile);
      toast.success("Import completed");
      setPreview(null);
      setPreviewOpen(false);
      setCsvFile(null);
      fetchStudents();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    }
  };

  const handleExport = async () => {
    if (!courseId) return;
    try {
      const blob = await exportStudents(courseId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `course_${courseId}_students.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Export started");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export students");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Students</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Add Student by Index/ID</label>
                <Input value={newIndex} onChange={(e) => setNewIndex(e.target.value)} placeholder="e.g., 2025/CS/001" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button type="submit">Add Student</Button>
              </div>
            </form>

            <div className="border-t pt-3">
              <label className="text-sm font-medium mb-2 block">Import CSV</label>
              <input
                id="students-csv"
                aria-label="Import students CSV"
                type="file"
                accept=".csv"
                onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => { setCsvFile(null); setPreview(null); }}>Clear</Button>
                <Button onClick={handleConfirmImport} disabled={!csvFile}>{!csvFile ? 'Import (preview first)' : 'Import'}</Button>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold">Current Students</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchStudents}>Refresh</Button>
                  <Button onClick={handleExport}>Export CSV</Button>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : students.length === 0 ? (
                <p className="text-sm text-gray-500 mt-2">No students enrolled.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto mt-2">
                  <table className="min-w-full text-sm table-auto">
                    <thead>
                      <tr className="text-left text-xs text-gray-600">
                        <th className="py-1">Index</th>
                        <th className="py-1">Name</th>
                        <th className="py-1">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id || s._id} className="border-b">
                          <td className="py-2">{s.indexNumber ?? s.index ?? s.regNo ?? '-'}</td>
                          <td className="py-2">{s.name ?? s.username ?? '-'}</td>
                          <td className="py-2">{s.email ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImportPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} preview={preview} onConfirm={handleConfirmImport} />
    </>
  );
};

export default StudentManagementDialog;
