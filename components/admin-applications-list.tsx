"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, User, MapPin, Building2, FileText, IndianRupee, Filter } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type AppDoc = {
  _id: string
  type: "shg" | "individual"
  applicantName: string
  address: string
  bankId: string
  branchId: string
  departmentId: string
  description: string
  status: "submitted" | "approved" | "rejected" | "sanctioned" | "disbursed"
  createdAt: string
  history?: Array<{ at: string; by: string; action: string }>
}

type Bank = { _id: string; name: string }
type Branch = { _id: string; bankId: string; name?: string; code?: string }

interface AdminApplicationsListProps {
  showSummary?: boolean
  showFilters?: boolean
}

type Department = { _id: string; name: string; code?: string }

export function AdminApplicationsList({ showSummary = true, showFilters = true }: AdminApplicationsListProps) {
  const [applications, setApplications] = useState<AppDoc[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterBank, setFilterBank] = useState<string>("all")
  const [filterBranch, setFilterBranch] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterStart, setFilterStart] = useState<string>("") // ISO date (yyyy-mm-dd)
  const [filterEnd, setFilterEnd] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      try {
        const [appsRes, banksRes, branchesRes, deptRes] = await Promise.all([
          fetch("/api/applications", { cache: "no-store" }),
          fetch("/api/banks", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
          fetch("/api/departments", { cache: "no-store" }),
        ])
        if (appsRes.ok) {
          const data = await appsRes.json()
          setApplications(data?.applications || [])
        }
        if (banksRes.ok) setBanks((await banksRes.json()).banks || [])
  if (branchesRes.ok) setBranches((await branchesRes.json()).branches || [])
  if (deptRes.ok) setDepartments((await deptRes.json()).departments || [])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const bankMap = new Map(banks.map((b) => [b._id, b.name]))
  const branchMap = new Map(branches.map((b) => [b._id, b.name || b.code || ""]))
  const deptMap = new Map(departments.map((d) => [d._id, d.name]))

  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      if (filterDept !== "all" && a.departmentId !== filterDept) return false
      if (filterBank !== "all" && a.bankId !== filterBank) return false
      if (filterBranch !== "all" && a.branchId !== filterBranch) return false
      if (filterStatus !== "all" && a.status !== filterStatus) return false
      if (filterStart) {
        const startTime = new Date(filterStart + "T00:00:00").getTime()
        if (new Date(a.createdAt).getTime() < startTime) return false
      }
      if (filterEnd) {
        const endTime = new Date(filterEnd + "T23:59:59").getTime()
        if (new Date(a.createdAt).getTime() > endTime) return false
      }
      return true
    })
  }, [applications, filterDept, filterBank, filterBranch, filterStatus, filterStart, filterEnd])

  const updateApplicationStatus = async (applicationId: string, newStatus: "approved" | "rejected") => {
    try {
      const action = newStatus === "approved" ? "approve" : "reject"
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, action }),
      })
      if (res.ok) {
        setApplications((prev) => prev.map((a) => (a._id === applicationId ? { ...a, status: newStatus } : a)))
      }
    } catch {}
  }

  const getStatusBadge = (status: AppDoc["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "sanctioned":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sanctioned
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      case "disbursed":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <IndianRupee className="w-3 h-3 mr-1" />
            Disbursed
          </Badge>
        )
      default:
        return null
    }
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

  if (isLoading) {
    return <div>Loading applications...</div>
  }

  if (applications.length === 0) {
    return (
      <Alert>
        <AlertDescription>No loan applications have been submitted yet.</AlertDescription>
      </Alert>
    )
  }

  const sourceForCounts = showSummary ? filteredApplications : filteredApplications
  const pendingCount = sourceForCounts.filter((app) => app.status === "submitted").length
  const approvedCount = sourceForCounts.filter((app) => app.status === "approved").length
  const rejectedCount = sourceForCounts.filter((app) => app.status === "rejected").length
  const disbursedCount = sourceForCounts.filter((app) => app.status === "disbursed").length

  return (
    <div className="space-y-6">
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredApplications.length}</div>
              <p className="text-xs text-muted-foreground">Total Applications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{disbursedCount}</div>
              <p className="text-xs text-muted-foreground">Disbursed</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {showFilters && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent side="bottom" className="max-h-72">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.sort((a,b)=>a.name.localeCompare(b.name)).map(d => (
                    <SelectItem key={d._id} value={d._id}>{d.name}{d.code?` (${d.code})`:""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBank} onValueChange={(val)=>{setFilterBank(val); setFilterBranch("all")}}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Bank" /></SelectTrigger>
                <SelectContent side="bottom" className="max-h-72">
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.sort((a,b)=>a.name.localeCompare(b.name)).map(b => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent side="bottom" className="max-h-72">
                  <SelectItem value="all">{filterBank === "all" ? "All Branches" : "All Branches (Bank)"}</SelectItem>
                  {branches
                    .filter(br => filterBank === "all" || br.bankId === filterBank)
                    .map(br => (
                      <SelectItem key={br._id} value={br._id}>{branchMap.get(br._id) || br._id}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent side="bottom" className="max-h-72">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="sanctioned">Sanctioned</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-medium text-muted-foreground tracking-wide uppercase">From</label>
                  <input
                    type="date"
                    value={filterStart}
                    onChange={(e)=>setFilterStart(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    aria-label="From date"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-medium text-muted-foreground tracking-wide uppercase">To</label>
                  <input
                    type="date"
                    value={filterEnd}
                    onChange={(e)=>setFilterEnd(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    aria-label="To date"
                  />
                </div>
              </div>
            </div>
            {(filterDept!=="all"||filterBank!=="all"||filterBranch!=="all"||filterStatus!=="all"||filterStart||filterEnd) && (
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                {filterDept!=="all" && <span className="px-2 py-1 bg-muted rounded">Dept: {deptMap.get(filterDept) || filterDept}</span>}
                {filterBank!=="all" && <span className="px-2 py-1 bg-muted rounded">Bank: {bankMap.get(filterBank) || filterBank}</span>}
                {filterBranch!=="all" && <span className="px-2 py-1 bg-muted rounded">Branch: {branchMap.get(filterBranch) || filterBranch}</span>}
                {filterStatus!=="all" && <span className="px-2 py-1 bg-muted rounded">Status: {filterStatus}</span>}
                {filterStart && <span className="px-2 py-1 bg-muted rounded">From: {filterStart}</span>}
                {filterEnd && <span className="px-2 py-1 bg-muted rounded">To: {filterEnd}</span>}
                <button
                  onClick={()=>{setFilterDept("all");setFilterBank("all");setFilterBranch("all");setFilterStatus("all");setFilterStart("");setFilterEnd("")}}
                  className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/15 transition"
                >Clear</button>
              </div>
            )}
            <Separator className="mt-2" />
          </div>
        )}
        <h2 className="text-lg font-semibold">All Loan Applications</h2>
        {filteredApplications.map((application) => {
          const bankName = bankMap.get(application.bankId) || "-"
          const branchName = branchMap.get(application.branchId) || "-"
          const deptName = deptMap.get(application.departmentId) || "-"
          return (
            <Card key={application._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{application.applicantName}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {application.type === "shg" ? "SHG Loan" : "Individual Loan"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {bankName} - {branchName}
                      </span>
                      <span className="flex items-center gap-1">
                        Dept: {deptName}
                      </span>
                      <span>ID: {application._id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">{getStatusBadge(application.status)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-sm text-gray-600">{application.address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Bank Branch</p>
                        <p className="text-sm text-gray-600">
                          {bankName} - {branchName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Loan Purpose & Description</p>
                      <p className="text-sm text-gray-600 mt-1">{application.description}</p>
                    </div>
                  </div>
                </div>

                {application.history && application.history.length > 0 && (
                  <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                    {application.history.map((action, index) => {
                      const getActionDisplay = (actionType: string) => {
                        switch (actionType) {
                          case "submitted":
                            return "Submitted"
                          case "approved":
                          case "approve":
                            return "Approved"
                          case "rejected":
                          case "reject":
                            return "Rejected"
                          case "sanction":
                            return "Sanctioned"
                          case "disburse":
                            return "Disbursed"
                          default:
                            return actionType.charAt(0).toUpperCase() + actionType.slice(1)
                        }
                      }
                      const getActionColor = (actionType: string) => {
                        switch (actionType) {
                          case "submitted":
                            return "bg-blue-50 text-blue-800 border-blue-200"
                          case "approved":
                          case "approve":
                            return "bg-green-50 text-green-800 border-green-200"
                          case "rejected":
                          case "reject":
                            return "bg-red-50 text-red-800 border-red-200"
                          case "sanction":
                            return "bg-purple-50 text-purple-800 border-purple-200"
                          case "disburse":
                            return "bg-purple-50 text-purple-800 border-purple-200"
                          default:
                            return "bg-gray-50 text-gray-800 border-gray-200"
                        }
                      }
                      return (
                        <div
                          key={index}
                          className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium border ${getActionColor(
                            action.action,
                          )}`}
                        >
                          <span className="font-semibold">{action.by}</span> {getActionDisplay(action.action)} • {formatDate(action.at)}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-xs text-gray-500">Submitted: {formatDate(application.createdAt)}</p>
                  {application.status === "submitted" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                        onClick={() => updateApplicationStatus(application._id, "rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateApplicationStatus(application._id, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                  {application.status === "approved" && (
                    <div className="text-sm text-green-600 font-medium">✓ Approved - Awaiting Bank Sanction</div>
                  )}
                  {application.status === "sanctioned" && (
                    <div className="text-sm text-purple-600 font-medium">✓ Sanctioned - Awaiting Disbursement</div>
                  )}
                  {application.status === "disbursed" && (
                    <div className="text-sm text-blue-600 font-medium">✓ Loan Successfully Disbursed</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
