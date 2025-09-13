"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  LogOut,
  CheckCircle,
  Clock,
  IndianRupee,
  Users,
  FileText,
  Calendar,
  MapPin,
  User,
} from "lucide-react"
import { GovernmentHeader } from "@/components/government-header"

type AppDoc = {
  _id: string
  applicantName: string
  type: "individual" | "shg"
  address: string
  description: string
  createdAt: string
  status: "submitted" | "approved" | "rejected" | "disbursed"
}

type Branch = { _id: string; bankId: string; name?: string; code?: string }
type Bank = { _id: string; name: string }

export default function BranchDashboard() {
  const [applications, setApplications] = useState<AppDoc[]>([])
  const [branchName, setBranchName] = useState<string>("")
  const [bankName, setBankName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json())
        if (me?.user?.role !== "branch") {
          setTimeout(() => router.push("/branch"), 100)
          return
        }
        // Load branch details
        const branchesRes = await fetch("/api/branches", { cache: "no-store" })
        const banksRes = await fetch("/api/banks", { cache: "no-store" })
        let branches: Branch[] = []
        let banks: Bank[] = []
        if (branchesRes.ok) branches = (await branchesRes.json()).branches || []
        if (banksRes.ok) banks = (await banksRes.json()).banks || []
        const myBranch = branches.find((b) => b._id === me.user.branchId)
        if (myBranch) {
          setBranchName(myBranch.name || myBranch.code || "")
          const bank = banks.find((bk) => bk._id === (myBranch as any).bankId?.toString?.() || (myBranch as any).bankId)
          setBankName(bank?.name || "")
        }

        // Load applications for this branch from API (server filters by branch)
        const res = await fetch("/api/applications", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setApplications(data?.applications || [])
        }
      } catch (error) {
        console.error('Error in branch dashboard init:', error)
        setTimeout(() => router.push("/branch"), 100)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    router.push("/branch")
  }

  const handleDisburse = async (applicationId: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, action: "disburse" }),
      })
      if (res.ok) {
        setApplications((prev) => prev.map((a) => (a._id === applicationId ? { ...a, status: "disbursed" } : a)))
      }
    } catch {}
  }

  const getStatusBadge = (status: AppDoc["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending Admin Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Ready for Disbursement
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "disbursed":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Disbursed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const approvedApplications = applications.filter((app) => app.status === "approved")
  const disbursedApplications = applications.filter((app) => app.status === "disbursed")
  const pendingApplications = applications.filter((app) => app.status === "submitted")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <GovernmentHeader />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <GovernmentHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Branch Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{bankName || "Branch Portal"}</h1>
              <p className="text-muted-foreground">{branchName} - Branch Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                  <p className="text-2xl font-bold">{applications.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingApplications.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to Disburse</p>
                  <p className="text-2xl font-bold">{approvedApplications.length}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Disbursed</p>
                  <p className="text-2xl font-bold">{disbursedApplications.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Applications Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ready" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ready">Ready to Disburse ({approvedApplications.length})</TabsTrigger>
                <TabsTrigger value="disbursed">Disbursed ({disbursedApplications.length})</TabsTrigger>
                <TabsTrigger value="all">All Applications ({applications.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ready" className="space-y-4">
                {approvedApplications.length === 0 ? (
                  <Alert>
                    <AlertDescription>No applications are ready for disbursement at this time.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {approvedApplications.map((application) => (
                      <Card key={application._id} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  {application.type === "shg" ? (
                                    <Users className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <User className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{application.applicantName}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {application.type === "shg" ? "SHG Loan" : "Individual Loan"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(application.status)}
                                <Button
                                  onClick={() => handleDisburse(application._id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <IndianRupee className="h-4 w-4 mr-2" />
                                  Disburse Loan
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{application.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm">
                                <strong>Description:</strong> {application.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="disbursed" className="space-y-4">
                {disbursedApplications.length === 0 ? (
                  <Alert>
                    <AlertDescription>No loans have been disbursed yet.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {disbursedApplications.map((application) => (
                      <Card key={application._id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{application.applicantName}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {application.type === "shg" ? "SHG Loan" : "Individual Loan"}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(application.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{application.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {applications.length === 0 ? (
                  <Alert>
                    <AlertDescription>No loan applications have been submitted to your branch yet.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <Card key={application._id} className="border-l-4 border-l-gray-300">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  {application.type === "shg" ? (
                                    <Users className="h-5 w-5 text-gray-600" />
                                  ) : (
                                    <User className="h-5 w-5 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{application.applicantName}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {application.type === "shg" ? "SHG Loan" : "Individual Loan"}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(application.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{application.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
