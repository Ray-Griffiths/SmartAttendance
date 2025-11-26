import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PreviewRow {
  index?: string;
  name?: string;
  email?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preview?: { summary?: any; validRows?: PreviewRow[]; invalidRows?: any[] } | null;
  onConfirm: () => void;
}

const ImportPreviewDialog: React.FC<Props> = ({ open, onOpenChange, preview, onConfirm }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <Card className="p-4">
            <CardContent>No preview available</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-sm">Previewed: {preview.summary?.totalPreviewed ?? 0}</p>
                <p className="text-sm">Valid: {preview.summary?.valid ?? 0}</p>
                <p className="text-sm">Invalid: {preview.summary?.invalid ?? 0}</p>
              </CardContent>
            </Card>

            <div className="max-h-64 overflow-y-auto border rounded p-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-600">
                    <th className="py-1">Index</th>
                    <th className="py-1">Name</th>
                    <th className="py-1">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.validRows || []).map((r, i) => (
                    <tr key={`v-${i}`} className="border-b">
                      <td className="py-1">{r.index}</td>
                      <td className="py-1">{r.name}</td>
                      <td className="py-1">{r.email ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.invalidRows && preview.invalidRows.length > 0 && (
              <div>
                <h4 className="text-sm font-medium">Invalid rows</h4>
                <div className="max-h-48 overflow-y-auto border rounded p-2 text-xs text-red-600">
                  {preview.invalidRows.map((inv, idx) => (
                    <div key={`inv-${idx}`} className="mb-2">
                      <div>Row: {inv.row}</div>
                      <div>Errors: {(inv.errors || []).join(", ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={onConfirm}>Confirm Import</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportPreviewDialog;
