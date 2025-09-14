"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button" 
import { Building2, LogOut } from "lucide-react"
import { GovernmentHeader } from "@/components/government-header"
import { BranchApplicationsList } from "@/components/branch-applications-list"

export default function BranchDashboard() {
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
        // Fetch branch + bank details
        const [branchesRes, banksRes] = await Promise.all([
          fetch("/api/branches", { cache: "no-store" }),
          fetch("/api/banks", { cache: "no-store" }),
        ])
        if (branchesRes.ok) {
          const branches = (await branchesRes.json()).branches || []
          const myBranch = branches.find((b: any) => b._id === me.user.branchId)
          if (myBranch) {
            setBranchName(myBranch.name || myBranch.code || "")
            if (banksRes.ok) {
              const banks = (await banksRes.json()).banks || []
              const bank = banks.find((bk: any) => bk._id === (myBranch as any).bankId?.toString?.() || (myBranch as any).bankId)
              setBankName(bank?.name || "")
            }
          }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
  <GovernmentHeader title="Branch Portal" />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
  <GovernmentHeader title="Branch Portal" />

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

        <BranchApplicationsList />
      </div>
    </div>
  )
}
