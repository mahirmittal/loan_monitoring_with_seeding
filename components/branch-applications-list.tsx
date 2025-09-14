"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Clock, IndianRupee, XCircle, FileText, MapPin, User, Users, Filter } from "lucide-react"

type AppDoc = {
  _id: string
  type: "shg" | "individual"
  applicantName: string
  address: string
  description: string
  status: "submitted" | "approved" | "rejected" | "sanctioned" | "disbursed"
  createdAt: string
  history?: Array<{ at: string; by: string; action: string }>
}

export function BranchApplicationsList() {
  const [applications, setApplications] = useState<AppDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters (no branch/bank/department filter needed - already scoped)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterStart, setFilterStart] = useState<string>("")
  const [filterEnd, setFilterEnd] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/applications", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
            ; (data?.applications) && setApplications(data.applications || [])
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return applications.filter(a => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false
      if (filterStart) {
        const start = new Date(filterStart + "T00:00:00").getTime()
        if (new Date(a.createdAt).getTime() < start) return false
      }
      if (filterEnd) {
        const end = new Date(filterEnd + "T23:59:59").getTime()
        if (new Date(a.createdAt).getTime() > end) return false
      }
      return true
    })
  }, [applications, filterStatus, filterStart, filterEnd])

  const pendingReview = filtered.filter(a => a.status === "submitted").length
  const pendingSanction = filtered.filter(a => a.status === "approved").length
  const readyToDisburse = filtered.filter(a => a.status === "sanctioned").length
  const disbursed = filtered.filter(a => a.status === "disbursed").length
  const rejected = filtered.filter(a => a.status === "rejected").length // not displayed in cards but maybe useful later

  const handleSanction = async (id: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "sanction" }),
      })
      if (res.ok) {
        setApplications(prev => prev.map(a => a._id === id ? { ...a, status: "sanctioned" } : a))
      }
    } catch { }
  }

  const handleDisburse = async (id: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "disburse" }),
      })
      if (res.ok) {
        setApplications(prev => prev.map(a => a._id === id ? { ...a, status: "disbursed" } : a))
      }
    } catch { }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: AppDoc["status"]) => {
    switch (status) {
      case "submitted":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case "sanctioned":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />Sanctioned</Badge>
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case "disbursed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><IndianRupee className="w-3 h-3 mr-1" />Disbursed</Badge>
      default:
        return null
    }
  }

  if (isLoading) return <div>Loading applications...</div>

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="flex gap-6 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Card className="min-w-[180px] border-l-4 border-l-blue-500"><CardContent className="pt-6"><div className="text-2xl font-bold">{filtered.length}</div><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card className="min-w-[180px] border-l-4 border-l-yellow-500"><CardContent className="pt-6"><div className="text-2xl font-bold text-yellow-600">{pendingReview}</div><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
        <Card className="min-w-[180px] border-l-4 border-l-green-500"><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{pendingSanction}</div><p className="text-xs text-muted-foreground">Pending Sanction</p></CardContent></Card>
        <Card className="min-w-[180px] border-l-4 border-l-purple-500"><CardContent className="pt-6"><div className="text-2xl font-bold text-purple-600">{readyToDisburse}</div><p className="text-xs text-muted-foreground">Ready to Disburse</p></CardContent></Card>
        <Card className="min-w-[180px] border-l-4 border-l-blue-500"><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{disbursed}</div><p className="text-xs text-muted-foreground">Disbursed</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Filter className="w-4 h-4" /> Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Status"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="sanctioned">Sanctioned</option>
            <option value="rejected">Rejected</option>
            <option value="disbursed">Disbursed</option>
          </select>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="block text-[10px] font-medium text-muted-foreground tracking-wide uppercase">From</label>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-[10px] font-medium text-muted-foreground tracking-wide uppercase">To</label>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" />
            </div>
          </div>
        </div>
        {(filterStatus !== "all" || filterStart || filterEnd) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {filterStatus !== "all" && <span className="px-2 py-1 bg-muted rounded">Status: {filterStatus}</span>}
            {filterStart && <span className="px-2 py-1 bg-muted rounded">From: {filterStart}</span>}
            {filterEnd && <span className="px-2 py-1 bg-muted rounded">To: {filterEnd}</span>}
            <button onClick={() => { setFilterStatus("all"); setFilterStart(""); setFilterEnd("") }} className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/15 transition">Clear</button>
          </div>
        )}
        <Separator className="mt-2" />
      </div>

      <h2 className="text-lg font-semibold">Loan Applications</h2>
      {filtered.length === 0 && (
        <Alert><AlertDescription>No applications match current filters.</AlertDescription></Alert>
      )}
      {filtered.map(app => (
        <Card key={app._id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{app.applicantName}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    {app.type === 'shg' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {app.type === 'shg' ? 'SHG Loan' : 'Individual Loan'}
                  </span>
                  <span>ID: {app._id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(app.status)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-gray-600">{app.address}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-gray-600 mt-1">{app.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {app.history && app.history.length > 0 && (
              <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                {app.history.map((h, i) => {
                  const labelMap: Record<string, string> = { submitted: 'Submitted', approve: 'Approved', approved: 'Approved', reject: 'Rejected', rejected: 'Rejected', sanction: 'Sanctioned', disburse: 'Disbursed' }
                  const colorMap: Record<string, string> = {
                    submitted: 'bg-blue-50 text-blue-800 border-blue-200',
                    approve: 'bg-green-50 text-green-800 border-green-200',
                    approved: 'bg-green-50 text-green-800 border-green-200',
                    reject: 'bg-red-50 text-red-800 border-red-200',
                    rejected: 'bg-red-50 text-red-800 border-red-200',
                    sanction: 'bg-purple-50 text-purple-800 border-purple-200',
                    disburse: 'bg-purple-50 text-purple-800 border-purple-200'
                  }
                  const label = labelMap[h.action] || h.action
                  const cls = colorMap[h.action] || 'bg-gray-50 text-gray-800 border-gray-200'
                  return <div key={i} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium border ${cls}`}><span className="font-semibold">{h.by}</span> {label} • {formatDate(h.at)}</div>
                })}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-xs text-gray-500">Submitted: {formatDate(app.createdAt)}</p>
              {app.status === 'approved' && (
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleSanction(app._id)}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Sanction
                </Button>
              )}
              {app.status === 'sanctioned' && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleDisburse(app._id)}>
                  <IndianRupee className="w-4 h-4 mr-1" /> Disburse
                </Button>
              )}
              {app.status === 'submitted' && (
                <div className="text-sm text-yellow-600 font-medium">Awaiting Admin Approval</div>
              )}
              {app.status === 'disbursed' && (
                <div className="text-sm text-blue-600 font-medium">Loan Disbursed</div>
              )}
              {app.status === 'rejected' && (
                <div className="text-sm text-red-600 font-medium">Rejected</div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
