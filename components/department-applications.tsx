"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, MapPin, Building2, FileText, IndianRupee } from "lucide-react"

interface LoanApplication {
  id: string
  loanType: "shg" | "individual"
  applicantName: string
  address: string
  bankBranch: string
  description: string
  department: string
  status: "pending" | "approved" | "rejected" | "sanctioned" | "disbursed"
  submittedAt: string
  adminAction?: {
    action: "approved" | "rejected"
    timestamp: string
  }
  branchAction?: {
    action: "disbursed"
    timestamp: string
    disbursedBy: string
  }
}

interface DepartmentApplicationsProps {
  user: any
}

export function DepartmentApplications({ user }: DepartmentApplicationsProps) {
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const [appsRes, branchesRes, banksRes] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/branches'),
          fetch('/api/banks')
        ])

        let branchMap: Record<string, any> = {}
        let bankMap: Record<string, any> = {}
        if (branchesRes.ok) {
          const brData = await branchesRes.json()
          brData.branches?.forEach((b: any) => { branchMap[b._id] = b })
        }
        if (banksRes.ok) {
          const bkData = await banksRes.json()
          bkData.banks?.forEach((b: any) => { bankMap[b._id] = b })
        }

        if (appsRes.ok) {
          const data = await appsRes.json()
          const transformedApplications = data.applications.map((app: any) => {
            const branch = branchMap[app.branchId]
            const bank = branch ? bankMap[branch.bankId] : undefined
            const branchDisplay = branch ? `${bank?.name || 'Unknown Bank'} - ${branch.name || branch.code || branch._id}` : (app.branchName || app.branchId || 'Unknown Branch')
            return {
              id: app._id,
              loanType: app.type || app.loanType,
              applicantName: app.applicantName,
              address: app.address,
              bankBranch: branchDisplay,
              description: app.description,
              department: app.departmentName || app.department || 'Unknown Department',
              status: app.status === 'submitted' ? 'pending' : app.status,
              submittedAt: app.createdAt,
              adminAction: app.history?.find((h: any) => h.action === 'approved' || h.action === 'rejected') ? {
                action: app.history.find((h: any) => h.action === 'approved' || h.action === 'rejected').action,
                timestamp: app.history.find((h: any) => h.action === 'approved' || h.action === 'rejected').at
              } : undefined,
              branchAction: app.history?.find((h: any) => h.action === 'disbursed') ? {
                action: 'disbursed',
                timestamp: app.history.find((h: any) => h.action === 'disbursed').at,
                disbursedBy: app.history.find((h: any) => h.action === 'disbursed').by
              } : undefined
            }
          })
          setApplications(transformedApplications)
        } else {
          console.error('Failed to fetch applications:', appsRes.statusText)
          const savedApplications = localStorage.getItem("loanApplications")
          if (savedApplications) {
            const allApplications: LoanApplication[] = JSON.parse(savedApplications)
            const departmentApplications = allApplications.filter((app) => app.department === user.department)
            setApplications(departmentApplications)
          }
        }
      } catch (error) {
        console.error('Error fetching applications:', error)
        const savedApplications = localStorage.getItem("loanApplications")
        if (savedApplications) {
          const allApplications: LoanApplication[] = JSON.parse(savedApplications)
          const departmentApplications = allApplications.filter((app) => app.department === user.department)
          setApplications(departmentApplications)
        }
      }
      setIsLoading(false)
    }
    fetchApplications()
  }, [user.department, user.departmentId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved - Awaiting Sanction
          </Badge>
        )
      case "sanctioned":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sanctioned - Awaiting Disbursement
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
            Loan Disbursed
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
    return <div>Loading your applications...</div>
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              You haven't submitted any loan applications yet. Use the "New Application" tab to submit your first
              application.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = applications.filter((app) => app.status === "pending").length
  const approvedCount = applications.filter((app) => app.status === "approved").length
  const rejectedCount = applications.filter((app) => app.status === "rejected").length
  const sanctionedCount = applications.filter((app) => app.status === "sanctioned").length
  const disbursedCount = applications.filter((app) => app.status === "disbursed").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Each card given min-width to align horizontally */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">Total Submitted</p>
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
            <div className="text-2xl font-bold text-purple-600">{sanctionedCount}</div>
            <p className="text-xs text-muted-foreground">Sanctioned</p>
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
        <h2 className="text-lg font-semibold">Your Submitted Applications</h2>
        {applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{application.applicantName}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                      {application.loanType === "shg" ? "SHG Loan" : "Individual Loan"}
                    </span>
                    <span>ID: {application.id}</span>
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
                      <p className="text-sm text-gray-600">{application.bankBranch}</p>
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

              {application.adminAction && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    application.adminAction.action === "approved" ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      application.adminAction.action === "approved" ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    <strong>Admin {application.adminAction.action === "approved" ? "Approved" : "Rejected"}:</strong>{" "}
                    {formatDate(application.adminAction.timestamp)}
                    {application.adminAction.action === "approved" && (
                      <span className="block mt-1 text-xs">
                        Your application has been forwarded to the bank for disbursement.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {application.branchAction && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50">
                  <p className="text-sm text-blue-800">
                    <strong>Loan Successfully Disbursed:</strong> {formatDate(application.branchAction.timestamp)}
                    <span className="block mt-1 text-xs">Your loan has been processed and disbursed by the bank.</span>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">Submitted: {formatDate(application.submittedAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
