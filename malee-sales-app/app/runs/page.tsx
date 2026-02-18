"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import {
  RUNS,
  formatDuration,
  formatDate,
} from "@/lib/mock-data"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Play,
  Search,
  FileText,
  GitCompare,
  Download,
  ExternalLink,
} from "lucide-react"

export default function RunsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRuns, setSelectedRuns] = useState<string[]>([])

  const filteredRuns = useMemo(() => {
    return RUNS.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (
        search &&
        !r.run_id.toLowerCase().includes(search.toLowerCase()) &&
        !r.notes.toLowerCase().includes(search.toLowerCase()) &&
        !r.owner.toLowerCase().includes(search.toLowerCase()) &&
        !r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
        return false
      return true
    }).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [search, statusFilter])

  const toggleSelect = (runId: string) => {
    setSelectedRuns((prev) => {
      if (prev.includes(runId)) return prev.filter((id) => id !== runId)
      if (prev.length >= 2) return [prev[1], runId]
      return [...prev, runId]
    })
  }

  return (
    <MainLayout title="Runs">
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Runs Center"
        description="History of all forecast runs with governance and comparison tools"
      >
        <Button asChild>
          <Link href="/new-prediction">
            <Play className="mr-2 h-4 w-4" />
            New Run
          </Link>
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search runs, owners, tags..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {selectedRuns.length === 2 && (
          <Button size="sm" className="h-8 text-xs" asChild>
            <Link href={`/runs/compare?a=${selectedRuns[0]}&b=${selectedRuns[1]}`}>
              <GitCompare className="mr-2 h-3.5 w-3.5" />
              Compare ({selectedRuns.length})
            </Link>
          </Button>
        )}
        {selectedRuns.length > 0 && selectedRuns.length < 2 && (
          <span className="text-xs text-muted-foreground">
            Select 1 more run to compare
          </span>
        )}
      </div>

      {/* Runs Table */}
      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead className="text-xs">Run ID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Model</TableHead>
                <TableHead className="text-xs">Horizon</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
                <TableHead className="text-xs text-right">WAPE</TableHead>
                <TableHead className="text-xs">Tags</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => (
                <TableRow
                  key={run.run_id}
                  className={selectedRuns.includes(run.run_id) ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                      checked={selectedRuns.includes(run.run_id)}
                      onChange={() => toggleSelect(run.run_id)}
                      aria-label={`Select ${run.run_id}`}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium">
                    {run.run_id}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(run.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(run.duration_sec)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {run.model_name} {run.model_version}
                  </TableCell>
                  <TableCell className="text-xs text-center tabular-nums">
                    {run.horizon_months}mo
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {run.owner}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {run.status === "success" ? `${run.wape}%` : "---"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {run.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {run.status === "success" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          asChild
                        >
                          <Link href={`/runs/${run.run_id}`}>
                            <FileText className="h-3.5 w-3.5" />
                            <span className="sr-only">Open Report</span>
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="sr-only">Download</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No runs found matching your filters.</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href="/new-prediction">Create a new run</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
    </MainLayout>
  )
}
