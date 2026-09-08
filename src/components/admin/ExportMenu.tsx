import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadWorkspaceWorkbook } from "@/lib/workspace-export";

type ExportKind = "csv" | "xlsx";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportMenu({
  canExportWorkspace,
  filters,
}: {
  canExportWorkspace: boolean;
  filters: { status?: string; link?: string; q?: string };
}) {
  const [exporting, setExporting] = useState<ExportKind>();

  async function exportCsv() {
    if (exporting) return;
    setExporting("csv");
    try {
      const blob = await api.exportBookings(filters);
      downloadBlob(
        blob,
        `meeting-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success("Filtered meeting data downloaded");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not create the export.",
      );
    } finally {
      setExporting(undefined);
    }
  }

  async function exportWorkspace() {
    if (exporting) return;
    setExporting("xlsx");
    try {
      const data = await api.workspaceExport();
      await downloadWorkspaceWorkbook(data);
      toast.success("Workspace workbook downloaded");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not create the export.",
      );
    } finally {
      setExporting(undefined);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Export meeting data"
          disabled={Boolean(exporting)}
          variant="outline"
        >
          {exporting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {exporting ? "Preparing…" : "Export"}
          <ChevronDown className="opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5">
          Download data
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="items-start gap-3 px-2 py-2.5"
          disabled={Boolean(exporting)}
          onSelect={() => void exportCsv()}
        >
          <FileText
            className="mt-0.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block font-medium">Current view · CSV</span>
            <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
              Uses the active search and filters.
            </span>
          </span>
        </DropdownMenuItem>
        {canExportWorkspace && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="items-start gap-3 px-2 py-2.5"
              disabled={Boolean(exporting)}
              onSelect={() => void exportWorkspace()}
            >
              <FileSpreadsheet
                className="mt-0.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block font-medium">
                  Full workspace · Excel
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  A multi-sheet workbook with all operational data.
                </span>
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
