import { ChevronRight, Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api";
import type {
  Booking,
  BookingLink,
  WorkspaceUser,
  WorkflowStatus,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { RequestDialog } from "./RequestDialog";

import { Empty, Loading, Shell, StatusBadge, fmt, labels } from "./shared";
export function Requests({
  canAssign,
  canEdit,
}: {
  canAssign: boolean;
  canEdit: boolean;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [linkFilter, setLinkFilter] = useState(
    new URLSearchParams(location.search).get("link") || "all",
  );
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<WorkflowStatus>("under_review");
  const [bulkAssignee, setBulkAssignee] = useState("unchanged");
  const [assignees, setAssignees] = useState<WorkspaceUser[]>([]);
  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.search).get("open"),
  );
  useEffect(() => {
    api.links().then((r) => setLinks(r.links));
    if (canAssign) api.assignees().then((r) => setAssignees(r.users));
  }, [canAssign]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .bookings({
          page,
          pageSize: 20,
          q: query,
          status: status === "all" ? "" : status,
          link: linkFilter === "all" ? "" : linkFilter,
        })
        .then((result) => {
          setBookings(result.bookings);
          setPagination(result.pagination);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [page, query, status, linkFilter]);
  useEffect(() => setSelectedIds([]), [page, query, status, linkFilter]);
  async function applyBulk() {
    const update = await api.bulkBookings({
      ids: selectedIds,
      status: bulkStatus,
      assignedTo:
        canAssign && bulkAssignee !== "unchanged" ? bulkAssignee : undefined,
    });
    toast.success(`${update.updated} responses updated`);
    setSelectedIds([]);
    const refreshed = await api.bookings({
      page,
      pageSize: 20,
      q: query,
      status: status === "all" ? "" : status,
      link: linkFilter === "all" ? "" : linkFilter,
    });
    setBookings(refreshed.bookings);
    setPagination(refreshed.pagination);
  }
  async function exportCsv() {
    const blob = await api.exportBookings({
      q: query,
      status: status === "all" ? "" : status,
      link: linkFilter === "all" ? "" : linkFilter,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `responses-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  }
  const rows = bookings;
  const selectedLink = links.find((link) => link.id === linkFilter);
  return (
    <Shell
      title={
        selectedLink ? `${selectedLink.internalName} responses` : "Responses"
      }
      description={
        selectedLink
          ? "Responses submitted through this booking link."
          : "Review availability, confirm meetings, and track outcomes."
      }
      action={
        <Button variant="outline" onClick={exportCsv}>
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      }
    >
      <Card>
        {canEdit && selectedIds.length > 0 && (
          <div className="flex flex-col gap-3 border-b bg-blue-500/5 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm font-medium">
              {selectedIds.length} selected
            </p>
            <Select
              value={bulkStatus}
              onValueChange={(value) => setBulkStatus(value as WorkflowStatus)}
            >
              <SelectTrigger
                aria-label="Set status for selected responses"
                className="w-full bg-background sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(labels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canAssign && (
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger
                  aria-label="Assign selected responses"
                  className="w-full bg-background sm:w-56"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Keep assignment</SelectItem>
                  {assignees.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      Assign to {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" onClick={applyBulk}>
              Apply changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        )}
        <CardHeader className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-2.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search responses by name or email"
              autoComplete="off"
              className="pl-9"
              name="response-search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter responses by status"
              className="w-full sm:w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(labels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={linkFilter}
            onValueChange={(value) => {
              setLinkFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter responses by booking link"
              className="w-full sm:w-52"
            >
              <SelectValue placeholder="All booking links" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All booking links</SelectItem>
              {links.map((link) => (
                <SelectItem key={link.id} value={link.id}>
                  {link.internalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all visible"
                      checked={
                        rows.length > 0 && selectedIds.length === rows.length
                      }
                      onCheckedChange={(checked) =>
                        setSelectedIds(checked ? rows.map((row) => row.id) : [])
                      }
                    />
                  </TableHead>
                )}
                <TableHead>Person</TableHead>
                <TableHead>Selected time</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                rows.map((b) => (
                  <TableRow key={b.id}>
                    {canEdit && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${b.name}`}
                          checked={selectedIds.includes(b.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((current) =>
                              checked
                                ? [...current, b.id]
                                : current.filter((id) => id !== b.id),
                            )
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.email} · {b.phone || "No phone"}
                      </p>
                    </TableCell>
                    <TableCell>{fmt(b.startsAt)}</TableCell>
                    <TableCell>{b.linkTitle}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        aria-label={`Open request from ${b.name}`}
                        onClick={() => setSelected(b.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="space-y-2 md:hidden">
          {!loading &&
            rows.map((b) => (
              <div key={b.id} className="flex gap-3 rounded-lg border p-4">
                {canEdit && (
                  <div className="pt-0.5">
                    <Checkbox
                      aria-label={`Select ${b.name}`}
                      checked={selectedIds.includes(b.id)}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? [...current, b.id]
                            : current.filter((id) => id !== b.id),
                        )
                      }
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => setSelected(b.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {b.email} · {b.linkTitle}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{fmt(b.startsAt)}</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </div>
                </button>
              </div>
            ))}
        </CardContent>
      </Card>
      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty />
      ) : (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} responses
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm tabular-nums">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page >= pagination.totalPages}
                  tabIndex={page >= pagination.totalPages ? -1 : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < pagination.totalPages) setPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      <RequestDialog
        id={selected}
        canAssign={canAssign}
        canEdit={canEdit}
        close={() => setSelected(null)}
        onUpdated={(updated) => {
          const leavesStatusFilter =
            status !== "all" && updated.status !== status;
          setBookings((current) =>
            current
              .map((booking) =>
                booking.id === updated.id
                  ? {
                      ...booking,
                      ...updated,
                      linkTitle: updated.linkTitle ?? booking.linkTitle,
                      linkSlug: updated.linkSlug ?? booking.linkSlug,
                    }
                  : booking,
              )
              .filter(
                (booking) => booking.id !== updated.id || !leavesStatusFilter,
              ),
          );
          if (leavesStatusFilter)
            setPagination((current) => {
              const total = Math.max(0, current.total - 1);
              return {
                ...current,
                total,
                totalPages: Math.max(1, Math.ceil(total / current.pageSize)),
              };
            });
        }}
      />
    </Shell>
  );
}
