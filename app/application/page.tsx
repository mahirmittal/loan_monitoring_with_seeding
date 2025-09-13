"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoanApplicationForm } from "@/components/loan-application-form"
import { DepartmentApplications } from "@/components/department-applications"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GovernmentHeader } from "@/components/government-header"

interface User {
  department: string
  name: string
  loginTime: string
}

export default function ApplicationPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        const data = await res.json()
        if (data?.user?.role === "department") {
          setUser({
            // departmentId is stored in token; keep shape compatible with existing components
            department: data.user.departmentId || "",
            name: data.user.username,
            loginTime: new Date().toISOString(),
          })
        } else {
          // Only redirect after we're sure there's no valid session
          setTimeout(() => router.push("/departments"), 100)
        }
      } catch {
        // Only redirect after we're sure there's no valid session
        setTimeout(() => router.push("/departments"), 100)
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
    router.push("/departments")
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

  if (!user) {
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
      <GovernmentHeader title="Loan Application Portal" department={user.name} onLogout={handleLogout} />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="new-application" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-secondary">
            <TabsTrigger value="new-application" className="font-medium">
              New Application
            </TabsTrigger>
            <TabsTrigger value="my-applications" className="font-medium">
              My Applications
            </TabsTrigger>
          </TabsList>
          <TabsContent value="new-application" className="mt-6">
            <LoanApplicationForm user={user} />
          </TabsContent>
          <TabsContent value="my-applications" className="mt-6">
            <DepartmentApplications user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
