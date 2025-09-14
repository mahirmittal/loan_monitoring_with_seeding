"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, CheckCircle, XCircle, Clock, IndianRupee, Layers } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Department {
  _id: string
  name: string
  code?: string | null
  username?: string
}

interface AppDoc {
  _id: string
  departmentId: string
  status: "submitted" | "approved" | "rejected" | "sanctioned" | "disbursed"
  createdAt: string
  type: string
}

interface AggregatedDepartment {
  department: Department
  counts: Record<string, number>
  total: number
}

export function AdminDepartmentSummary() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [applications, setApplications] = useState<AppDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [selectedDept, setSelectedDept] = useState<string>("all")

  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, appsRes] = await Promise.all([
          fetch("/api/departments", { cache: "no-store" }),
          fetch("/api/applications", { cache: "no-store" }),
        ])
        if (deptRes.ok) {
          const d = await deptRes.json()
          setDepartments(d.departments || [])
        }
        if (appsRes.ok) {
          const a = await appsRes.json()
          setApplications(a.applications || [])
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const aggregated = useMemo<AggregatedDepartment[]>(() => {
    if (!departments.length) return []
    const byDept: Record<string, AggregatedDepartment> = {}
    for (const dept of departments) {
      byDept[dept._id] = {
        department: dept,
        counts: { submitted: 0, approved: 0, rejected: 0, sanctioned: 0, disbursed: 0 },
        total: 0,
      }
    }
    for (const app of applications) {
      if (app.departmentId && byDept[app.departmentId]) {
        byDept[app.departmentId].counts[app.status] = (byDept[app.departmentId].counts[app.status] || 0) + 1
        byDept[app.departmentId].total += 1
      }
    }
    return Object.values(byDept).sort((a, b) => b.total - a.total)
  }, [applications, departments])

  const grandTotals = useMemo(() => {
    const initial = { submitted: 0, approved: 0, rejected: 0, sanctioned: 0, disbursed: 0, total: 0 }
    return aggregated.reduce((acc, d) => {
      acc.submitted += d.counts.submitted
      acc.approved += d.counts.approved
      acc.rejected += d.counts.rejected
      acc.sanctioned += d.counts.sanctioned
      acc.disbursed += d.counts.disbursed
      acc.total += d.total
      return acc
    }, initial)
  }, [aggregated])

  const statusMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    submitted: { label: "Pending", color: "text-yellow-600", icon: <Clock className="w-4 h-4" /> },
    approved: { label: "Approved", color: "text-green-600", icon: <CheckCircle className="w-4 h-4" /> },
    sanctioned: { label: "Sanctioned", color: "text-purple-600", icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { label: "Rejected", color: "text-red-600", icon: <XCircle className="w-4 h-4" /> },
    disbursed: { label: "Disbursed", color: "text-blue-600", icon: <IndianRupee className="w-4 h-4" /> },
  }

  if (isLoading) return <div>Loading department summary...</div>
  if (error) return <Alert><AlertDescription>{error}</AlertDescription></Alert>
  if (!aggregated.length) return <Alert><AlertDescription>No departments or applications found.</AlertDescription></Alert>

  const selectedAgg = selectedDept === "all" ? null : aggregated.find(a => a.department._id === selectedDept)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Department Analytics</h2>
          <p className="text-xs text-muted-foreground">Select a department to view its performance or view aggregate totals.</p>
        </div>
        <div className="w-full md:w-72">
          <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent side="bottom" className="max-h-72">
              <SelectItem value="all">All Departments (Aggregate)</SelectItem>
              {departments.sort((a,b) => a.name.localeCompare(b.name)).map((d) => (
                <SelectItem key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDept === "all" && (
        <div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Card className="min-w-[160px] flex-1">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{grandTotals.total}</div>
                <p className="text-xs text-muted-foreground">Total Dept Applications</p>
              </CardContent>
            </Card>
            {Object.entries(statusMeta).map(([key, meta]) => (
              <Card key={key} className="min-w-[160px]">
                <CardContent className="pt-6">
                  <div className={`text-2xl font-bold ${meta.color} flex items-center gap-2`}>
                    {grandTotals[key as keyof typeof grandTotals]}
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedDept !== "all" && (
        <div className="space-y-4">
          {!selectedAgg && (
            <Alert><AlertDescription>Department not found.</AlertDescription></Alert>
          )}
          {selectedAgg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> {selectedAgg.department.name}
                </h3>
                {selectedAgg.department.code && <Badge variant="outline" className="text-[10px] py-0.5 px-1">{selectedAgg.department.code}</Badge>}
                <span className="ml-auto text-sm text-muted-foreground">{selectedAgg.total} total applications</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(statusMeta).map(([k, meta]) => (
                  <Card key={k} className="shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className={`text-3xl font-bold mb-2 ${meta.color}`}>{selectedAgg.counts[k as keyof typeof selectedAgg.counts]}</div>
                      <p className="text-[11px] tracking-wide uppercase text-muted-foreground">{meta.label}</p>
                    </CardContent>
                  </Card>
                ))}
                <Card className="shadow-sm bg-muted/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-3xl font-bold mb-2 flex items-center gap-1 text-gray-800">
                      <Layers className="w-4 h-4" /> {selectedAgg.total}
                    </div>
                    <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
