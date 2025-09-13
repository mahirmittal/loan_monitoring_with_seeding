"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, User, MapPin, Building2, FileText, IndianRupee } from "lucide-react"

type AppDoc = {
  _id: string
  type: "shg" | "individual"
  applicantName: string
  address: string
  bankId: string
  branchId: string
  departmentId: string
  description: string
  status: "submitted" | "approved" | "rejected" | "disbursed"
  createdAt: string
  history?: Array<{ at: string; by: string; action: string }>
}

type Bank = { _id: string; name: string }
type Branch = { _id: string; bankId: string; name?: string; code?: string }

export function AdminApplicationsList() {
  const [applications, setApplications] = useState<AppDoc[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [appsRes, banksRes, branchesRes] = await Promise.all([
          fetch("/api/applications", { cache: "no-store" }),
          fetch("/api/banks", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
        ])
        if (appsRes.ok) {
          const data = await appsRes.json()
          setApplications(data?.applications || [])
        }
        if (banksRes.ok) setBanks((await banksRes.json()).banks || [])
        if (branchesRes.ok) setBranches((await branchesRes.json()).branches || [])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const bankMap = new Map(banks.map((b) => [b._id, b.name]))
  const branchMap = new Map(branches.map((b) => [b._id, b.name || b.code || ""]))

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

  const pendingCount = applications.filter((app) => app.status === "submitted").length
  const approvedCount = applications.filter((app) => app.status === "approved").length
  const rejectedCount = applications.filter((app) => app.status === "rejected").length
  const disbursedCount = applications.filter((app) => app.status === "disbursed").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{applications.length}</div>
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

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Loan Applications</h2>
        {applications.map((application) => {
          const bankName = bankMap.get(application.bankId) || "-"
          const branchName = branchMap.get(application.branchId) || "-"
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

                {application.history?.map((action, index) => {
                  const getActionDisplay = (actionType: string) => {
                    switch (actionType) {
                      case "submitted":
                        return "Submitted"
                      case "approved":
                        return "Approved"
                      case "rejected":
                        return "Rejected"
                      case "reject":
                        return "Rejected"
                      case "approve":
                        return "Approved"
                      case "disburse":
                        return "Disbursed"
                      default:
                        return actionType.charAt(0).toUpperCase() + actionType.slice(1)
                    }
                  }

                  const getActionColor = (actionType: string) => {
                    switch (actionType) {
                      case "submitted":
                        return "bg-blue-50 text-blue-800"
                      case "approved":
                      case "approve":
                        return "bg-green-50 text-green-800"
                      case "rejected":
                      case "reject":
                        return "bg-red-50 text-red-800"
                      case "disburse":
                        return "bg-purple-50 text-purple-800"
                      default:
                        return "bg-gray-50 text-gray-800"
                    }
                  }

                  return (
                    <div key={index} className={`mb-4 p-3 rounded-lg ${getActionColor(action.action)}`}>
                      <p className="text-sm">
                        <strong>
                          {action.by} {getActionDisplay(action.action)}:
                        </strong>{" "}
                        {formatDate(action.at)}
                      </p>
                    </div>
                  )
                })}

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
                    <div className="text-sm text-green-600 font-medium">✓ Approved - Awaiting Bank Disbursement</div>
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
