"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Building2, Search, Key, Eye, EyeOff, Copy, Edit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

type ApiBank = { _id: string; name: string; code?: string }
type ApiBranch = { _id: string; bankId: string; name?: string; code?: string; username: string; demoPassword?: string }

export function BankManagement() {
  const [banks, setBanks] = useState<ApiBank[]>([])
  const [branchesByBank, setBranchesByBank] = useState<Record<string, ApiBranch[]>>({})
  const [newBankName, setNewBankName] = useState("")
  const [newBankCode, setNewBankCode] = useState("")
  const [selectedBankId, setSelectedBankId] = useState("")
  const [newBranchName, setNewBranchName] = useState("")
  const [isAddingBank, setIsAddingBank] = useState(false)
  const [isAddingBranch, setIsAddingBranch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [editingCredentials, setEditingCredentials] = useState<{ [key: string]: boolean }>({})
  const [lastCreatedCredential, setLastCreatedCredential] = useState<{ username: string; password: string } | null>(
    null,
  )

  useEffect(() => {
    loadBanks()
    // Preload all branches (for credentials tab)
    loadAllBranches()
  }, [])

  async function loadBanks() {
    try {
      const res = await fetch("/api/banks", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setBanks(data.banks || [])
      }
    } catch {
      toast({ title: "Error", description: "Failed to load banks", variant: "destructive" })
    }
  }

  async function loadBranches(bankId: string) {
    try {
      const res = await fetch(`/api/branches?bankId=${bankId}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setBranchesByBank((prev) => ({ ...prev, [bankId]: data.branches || [] }))
      }
    } catch {}
  }


  async function loadAllBranches() {
    try {
      const res = await fetch(`/api/branches`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        // Group by bankId
        const grouped: Record<string, ApiBranch[]> = {}
        for (const b of data.branches || []) {
          const key = (b as any).bankId?.toString?.() || (b as any).bankId
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(b)
        }
        setBranchesByBank(grouped)
      }
    } catch {}
  }

  const generateUsername = (bankName: string, branchName: string) => {
    const bankCode = bankName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 6)
    const branchCode = branchName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 6)
    return `${bankCode}_${branchCode}`
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%"
    let password = ""
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    return password
  }

  async function handleAddBank() {
    if (!newBankName.trim()) return
    try {
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBankName.trim(), code: newBankCode.trim() || undefined }),
      })
      if (res.ok) {
        await loadBanks()
        setNewBankName("")
        setNewBankCode("")
        setIsAddingBank(false)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Error", description: data?.error || "Unable to add bank", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Unable to add bank", variant: "destructive" })
    }
  }

  const updateCredentials = async (id: string, newUsername: string, newPassword: string, type: 'branch' | 'department') => {
    try {
      // Current API exposes PATCH without /:id for credentials update; send identifier in body
      const endpoint = type === 'branch' ? `/api/branches` : `/api/departments`
      const body = type === 'branch'
        ? { branchId: id, username: newUsername, password: newPassword }
        : { departmentId: id, username: newUsername, password: newPassword }
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        toast({ title: 'Success', description: `${type} credentials updated successfully` })
        if (type === 'branch') {
          loadAllBranches()
  }
      } else {
        const data = await res.json().catch(() => ({} as any))
        toast({ title: 'Error', description: data?.error || `Failed to update ${type} credentials`, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: `Failed to update ${type} credentials`, variant: 'destructive' })
    }
  }

  async function handleAddBranch() {
    if (!selectedBankId || !newBranchName.trim()) return
    const bank = banks.find((b) => b._id === selectedBankId)
    if (!bank) return
    const username = generateUsername(bank.name, newBranchName.trim())
    const password = generatePassword()

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: selectedBankId,
          name: newBranchName.trim(),
          code: undefined,
          username,
          password,
        }),
      })
      if (res.ok) {
        await loadBranches(selectedBankId)
        await loadAllBranches()
        setNewBranchName("")
        setIsAddingBranch(false)
        setLastCreatedCredential({ username, password })
        toast({ title: "Branch added", description: "Credentials generated. Save them securely." })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Error", description: data?.error || "Unable to add branch", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Unable to add branch", variant: "destructive" })
    }
  }

  async function handleDeleteBank(id: string) {
    try {
      const res = await fetch(`/api/banks/${id}`, { method: "DELETE" })
      if (res.ok) {
        await loadBanks()
        await loadAllBranches()
      }
    } catch {}
  }

  async function handleDeleteBranch(branchId: string, bankId: string) {
    try {
      const res = await fetch(`/api/branches/${branchId}`, { method: "DELETE" })
      if (res.ok) {
        await loadBranches(bankId)
        await loadAllBranches()
      }
    } catch {}
  }

  // Filtering
  const filteredBanks = banks.filter((bank) => {
    const bankNameMatch = bank.name.toLowerCase().includes(searchQuery.toLowerCase())
    const branchMatch = (branchesByBank[bank._id] || []).some((br) =>
      (br.name || br.code || "").toLowerCase().includes(searchQuery.toLowerCase()),
    )
    return bankNameMatch || branchMatch
  })

  const allBranches: ApiBranch[] = Object.values(branchesByBank).flat()

  const filteredCredentials = allBranches.filter((credential) => {
    const bankName = banks.find((b) => b._id === (credential as any).bankId)?.name || ""
    const branchName = credential.name || credential.code || ""
    return (
      bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branchName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="banks" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="banks">Banks & Branches</TabsTrigger>
              <TabsTrigger value="credentials">Branch Credentials</TabsTrigger>
            </TabsList>

            <TabsContent value="banks" className="space-y-6">
              {/* Add New Bank */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add New Bank</h3>
                  <Button onClick={() => setIsAddingBank(!isAddingBank)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank
                  </Button>
                </div>

                {isAddingBank && (
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Enter bank name (e.g., State Bank of India)"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                    />
                    <Input
                      placeholder="Optional bank code (e.g., SBI)"
                      value={newBankCode}
                      onChange={(e) => setNewBankCode(e.target.value)}
                    />
                    <Button onClick={handleAddBank} disabled={!newBankName.trim()}>
                      Add
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingBank(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Add New Branch */}
              {banks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Add New Branch</h3>
                    <Button onClick={() => setIsAddingBranch(!isAddingBranch)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Branch
                    </Button>
                  </div>

                  {isAddingBranch && (
                    <div className="space-y-2">
                      <Label>Select Bank</Label>
                      <Select
                        value={selectedBankId}
                        onValueChange={(v) => {
                          setSelectedBankId(v)
                          loadBranches(v)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank._id} value={bank._id}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter branch name (e.g., Main Branch, City Center)"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                        />
                        <Button onClick={handleAddBranch} disabled={!selectedBankId || !newBranchName.trim()}>
                          Add
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddingBranch(false)}>
                          Cancel
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Login credentials will be generated for this branch and shown once after creation. Save them
                        securely.
                      </p>

                      {lastCreatedCredential && (
                        <Alert className="mt-4 border-green-200 bg-green-50">
                          <Key className="h-4 w-4" />
                          <div>
                            <h4 className="font-medium text-green-800">New Branch Credentials Created</h4>
                            <p className="text-sm text-green-700 mb-3">
                              Save these credentials securely. They cannot be retrieved later.
                            </p>
                            <div className="space-y-2">
                              <div className="flex gap-2 items-center">
                                <Label className="text-xs font-medium text-green-800 w-16">Username:</Label>
                                <code className="bg-white px-2 py-1 rounded text-sm border">
                                  {lastCreatedCredential.username}
                                </code>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigator.clipboard.writeText(lastCreatedCredential.username)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex gap-2 items-center">
                                <Label className="text-xs font-medium text-green-800 w-16">Password:</Label>
                                <code className="bg-white px-2 py-1 rounded text-sm border">
                                  {showPasswords["__last"] ? lastCreatedCredential.password : "••••••••••••"}
                                </code>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowPasswords((p) => ({ ...p, __last: !p["__last"] }))}
                                >
                                  {showPasswords["__last"] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigator.clipboard.writeText(lastCreatedCredential.password)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Configured Banks & Branches</h3>
                  {banks.length > 0 && (
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search banks or branches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </div>

                {banks.length === 0 ? (
                  <Alert>
                    <AlertDescription>No banks configured yet. Add banks and their branches.</AlertDescription>
                  </Alert>
                ) : filteredBanks.length === 0 ? (
                  <Alert>
                    <AlertDescription>No banks or branches found matching "{searchQuery}".</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground">
                        Found {filteredBanks.length} bank{filteredBanks.length !== 1 ? "s" : ""} matching "{searchQuery}
                        "
                      </p>
                    )}

                    {filteredBanks.map((bank) => (
                      <Card key={bank._id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-lg">{bank.name}</h4>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteBank(bank._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {(branchesByBank[bank._id] || []).length === 0 ? (
                            <p className="text-muted-foreground text-sm">No branches added yet</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Branches ({(branchesByBank[bank._id] || []).length}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(branchesByBank[bank._id] || []).map((branch) => (
                                  <Badge key={branch._id} variant="secondary" className="flex items-center gap-1">
                                    {branch.name || branch.code}
                                    <button
                                      onClick={() => handleDeleteBranch(branch._id, bank._id)}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Branch Login Credentials</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    {filteredCredentials.length} Accounts
                  </Badge>
                </div>

                {filteredCredentials.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No branch accounts available. Add branches to generate login credentials.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4">
                    {filteredCredentials.map((credential) => {
                      const bankName = banks.find((b) => b._id === (credential as any).bankId)?.name || "-"
                      const branchName = credential.name || credential.code || "-"
                      const credentialKey = credential._id
                      const isEditing = editingCredentials[credentialKey]
                      return (
                        <Card key={credentialKey} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">{bankName}</h4>
                                  <p className="text-sm text-muted-foreground">{branchName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Branch Login</Badge>
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const newUsername = (document.getElementById(`username-${credentialKey}`) as HTMLInputElement)?.value
                                          const newPassword = (document.getElementById(`password-${credentialKey}`) as HTMLInputElement)?.value
                                          if (newUsername && newPassword) {
                                            updateCredentials(credentialKey, newUsername, newPassword, 'branch')
                                            setEditingCredentials(prev => ({ ...prev, [credentialKey]: false }))
                                          }
                                        }}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingCredentials(prev => ({ ...prev, [credentialKey]: false }))}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingCredentials(prev => ({ ...prev, [credentialKey]: true }))}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Username</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`username-${credentialKey}`}
                                      defaultValue={credential.username}
                                      readOnly={!isEditing}
                                      className="font-mono text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigator.clipboard.writeText(credential.username)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Password</Label>
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id={`password-${credentialKey}`}
                                        type="text"
                                        defaultValue=""
                                        placeholder="Enter new password"
                                        className="font-mono text-sm"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id={`password-${credentialKey}`}
                                        type={showPasswords[credentialKey] ? 'text' : 'password'}
                                        defaultValue={credential.demoPassword || ''}
                                        readOnly
                                        className="font-mono text-sm"
                                        placeholder={credential.demoPassword ? '••••••••••••' : 'No password available'}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowPasswords(p => ({ ...p, [credentialKey]: !p[credentialKey] }))}
                                        disabled={!credential.demoPassword}
                                      >
                                        {showPasswords[credentialKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (credential.demoPassword) {
                                            navigator.clipboard.writeText(credential.demoPassword)
                                            toast({ title: 'Copied', description: 'Password copied to clipboard' })
                                          } else {
                                            toast({ title: 'No Password', description: 'Password not available for this branch', variant: 'destructive' })
                                          }
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {isEditing
                                      ? 'Enter a new password'
                                      : credential.demoPassword
                                        ? showPasswords[credentialKey]
                                          ? 'Password visible'
                                          : 'Password hidden'
                                        : 'No password stored'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {/* Department credentials intentionally removed: managed separately in Department Management page */}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
