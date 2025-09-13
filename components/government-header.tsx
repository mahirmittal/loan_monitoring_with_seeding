"use client"

import { Shield, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GovernmentHeaderProps {
  title: string
  department?: string
  onLogout?: () => void
  showLogout?: boolean
}

export function GovernmentHeader({ title, department, onLogout, showLogout = true }: GovernmentHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 text-white shadow-xl relative overflow-hidden">
      {/* Simplified background overlays without problematic SVG */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-transparent to-green-500/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md border border-white/25 shadow-lg">
                <Shield className="h-8 w-8 drop-shadow-lg filter brightness-110" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight drop-shadow-md">{title}</h1>
                {department && (
                  <p className="text-blue-100 text-sm font-medium tracking-wide drop-shadow-sm">{department}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right text-sm bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
              <p className="text-white font-semibold drop-shadow-sm">Government of India</p>
              <p className="text-blue-100 text-xs tracking-wide">Official Portal</p>
            </div>
            {showLogout && onLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="bg-white/15 border-white/30 text-white hover:bg-white/25 hover:border-white/50 hover:scale-105 transition-all duration-300 backdrop-blur-md shadow-lg"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
