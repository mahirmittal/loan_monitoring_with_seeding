"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GovernmentHeader } from "@/components/government-header"
import { Building2, Lock } from "lucide-react"

interface Department {
  id: string
  name: string
  code: string
  description: string
  username: string
  password: string
  createdAt: string
}

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // department role login
        body: JSON.stringify({ role: "department", username, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Invalid username or password")
        setIsLoading(false)
        return
      }

      // On success, an httpOnly cookie session is set by the server
      router.push("/application")
    } catch {
      setError("Unable to sign in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen modern-gradient-bg">
      <GovernmentHeader title="Government Loan Application System" showLogout={false} />

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-md space-y-8 fade-in">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="p-4 bg-primary/10 rounded-2xl backdrop-blur-sm border border-primary/20">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 bg-accent rounded-full">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-bold text-foreground">Department Login Portal</h2>
              <p className="text-muted-foreground text-lg">Secure access for government departments</p>
            </div>
          </div>

          <Card className="gov-card-elevated slide-up">
            <CardHeader className="text-center pb-6 space-y-3">
              <CardTitle className="text-2xl font-serif text-primary">Department Authentication</CardTitle>
              <CardDescription className="text-base">
                Enter your department credentials to access the loan application system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="username" className="font-semibold text-foreground">
                    Department Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter department username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 gov-input text-base"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="font-semibold text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 gov-input text-base"
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold gov-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Authenticating..." : "Sign In to Department Portal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
