"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminApplicationsList } from "@/components/admin-applications-list"
import { BankManagement } from "@/components/bank-management"
import { DepartmentManagement } from "@/components/department-management"
import { GovernmentHeader } from "@/components/government-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AdminUser {
  role: string
  name: string
  loginTime: string
}

export default function AdminDashboardPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        const data = await res.json()
        if (data?.user?.role === "admin") {
          setAdminUser({ role: "admin", name: data.user.username, loginTime: new Date().toISOString() })
        } else {
          setTimeout(() => router.push("/admin"), 100)
        }
      } catch {
        setTimeout(() => router.push("/admin"), 100)
      } finally {
        setIsLoading(false)
      }
    }
    check()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    router.push("/admin")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <GovernmentHeader title="Administrative Dashboard" department={adminUser.name} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications">Loan Applications</TabsTrigger>
            <TabsTrigger value="banks">Bank Management</TabsTrigger>
            <TabsTrigger value="departments">Department Management</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <AdminApplicationsList />
          </TabsContent>

          <TabsContent value="banks">
            <BankManagement />
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
