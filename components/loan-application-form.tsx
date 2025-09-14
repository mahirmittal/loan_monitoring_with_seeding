"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Search } from "lucide-react"

interface User {
  department: string
  name: string
  loginTime: string
}

interface LoanApplicationFormProps {
  user: User
}

interface LoanApplication {
  id: string
  loanType: "shg" | "individual"
  applicantName: string
  address: string
  bankBranch: string
  description: string
  department: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
}

interface ApiBank {
  _id: string
  name: string
}
interface ApiBranch {
  _id: string
  name?: string
  code?: string
} // name/code depending on your schema

export function LoanApplicationForm({ user }: LoanApplicationFormProps) {
  const [loanType, setLoanType] = useState<"shg" | "individual">("individual")
  const [applicantName, setApplicantName] = useState("")
  const [address, setAddress] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [openBank, setOpenBank] = useState(false)
  const [openBranch, setOpenBranch] = useState(false)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [banks, setBanks] = useState<ApiBank[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [bankSearchQuery, setBankSearchQuery] = useState("")
  const [branchSearchQuery, setBranchSearchQuery] = useState("")

  // Load banks from API
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const res = await fetch("/api/banks", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setBanks(data?.banks || [])
        }
      } catch {}
    }
    loadBanks()
  }, [])

  // Reset branch selection when bank changes and load branches from API
  useEffect(() => {
    setSelectedBranch("")
    setBranchSearchQuery("")
    const loadBranches = async () => {
      if (!selectedBank) {
        setBranches([])
        return
      }
      try {
        const res = await fetch(`/api/branches?bankId=${selectedBank}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setBranches(data?.branches || [])
        }
      } catch {}
    }
    loadBranches()
  }, [selectedBank])

  const selectedBankData = banks.find((bank) => bank._id === selectedBank)
  const filteredBanks = banks // command handles filtering automatically
  const filteredBranches = branches

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        type: loanType,
        applicantName,
        address,
        bankId: selectedBank, // Mongo _id
        branchId: selectedBranch, // Mongo _id
        description,
      }
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        // optional error display
        setIsSubmitting(false)
        return
      }
      setIsSubmitting(false)
      setIsSubmitted(true)
      // reset after success
      setTimeout(() => {
        setIsSubmitted(false)
        setApplicantName("")
        setAddress("")
        setSelectedBank("")
        setSelectedBranch("")
        setDescription("")
        setBankSearchQuery("")
        setBranchSearchQuery("")
      }, 3000)
    } catch {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Submitted Successfully!</h3>
            <p className="text-gray-600">
              Your loan application has been submitted and is now pending review by the admin.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show message if no banks are configured
  if (banks.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Banks Not Configured</h3>
            <p className="text-gray-600">
              No banks have been configured yet. Please contact the administrator to add banks and branches before
              submitting loan applications.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Loan Application Form</CardTitle>
        <p className="text-gray-600">Please fill out all required fields to submit your loan application.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Loan Type *</Label>
            <RadioGroup value={loanType} onValueChange={(value: "shg" | "individual") => setLoanType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual">Individual Loan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shg" id="shg" />
                <Label htmlFor="shg">Self Help Group (SHG) Loan</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Applicant/SHG Name */}
          <div className="space-y-2">
            <Label htmlFor="applicantName" className="text-base font-semibold">
              {loanType === "shg" ? "SHG Name" : "Applicant Name"} *
            </Label>
            <Input
              id="applicantName"
              type="text"
              placeholder={loanType === "shg" ? "Enter SHG name" : "Enter applicant's full name"}
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base font-semibold">
              Address *
            </Label>
            <Textarea
              id="address"
              placeholder="Enter complete address with village, district, state, and PIN code"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Bank Selection (Searchable Combobox) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Select Bank *</Label>
            <Popover open={openBank} onOpenChange={setOpenBank}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openBank}
                  className="w-full justify-between"
                >
                  {selectedBankData ? selectedBankData.name : "Choose a bank"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                  <CommandInput placeholder="Search bank..." />
                  <CommandEmpty>No bank found.</CommandEmpty>
                  <CommandGroup>
                    {filteredBanks.map(bank => (
                      <CommandItem
                        key={bank._id}
                        value={bank.name}
                        onSelect={() => {
                          setSelectedBank(bank._id)
                          setOpenBank(false)
                        }}
                      >
                        <span className={cn("truncate", bank._id === selectedBank && "font-semibold")}>{bank.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <input type="hidden" name="bankId" value={selectedBank} required />
          </div>

          {/* Branch Selection (Searchable Combobox) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Select Branch *</Label>
            <Popover open={openBranch} onOpenChange={setOpenBranch}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openBranch}
                  disabled={!selectedBank}
                  className="w-full justify-between disabled:opacity-50"
                >
                  {selectedBranch
                    ? (filteredBranches.find(b => b._id === selectedBranch)?.name || filteredBranches.find(b => b._id === selectedBranch)?.code)
                    : selectedBank ? "Choose a branch" : "Select a bank first"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                {selectedBank ? (
                  <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Search branch..." />
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      {filteredBranches.map(branch => (
                        <CommandItem
                          key={branch._id}
                          value={branch.name || branch.code || branch._id}
                          onSelect={() => {
                            setSelectedBranch(branch._id)
                            setOpenBranch(false)
                          }}
                        >
                          <span className={cn("truncate", branch._id === selectedBranch && "font-semibold")}>{branch.name || branch.code || branch._id}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">Select a bank first</div>
                )}
              </PopoverContent>
            </Popover>
            <input type="hidden" name="branchId" value={selectedBranch} required />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Loan Purpose & Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe the purpose of the loan, amount needed, and how it will be used..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting || !selectedBank || !selectedBranch}
            >
              {isSubmitting ? "Submitting Application..." : "Submit Loan Application"}
            </Button>
          </div>
        </form>

        <Alert className="mt-6">
          <AlertDescription>
            <strong>Note:</strong> All fields marked with (*) are required. Your application will be reviewed by the
            admin and you will be notified of the decision.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
