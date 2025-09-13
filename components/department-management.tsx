"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Copy, Trash2, Edit, Eye, EyeOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Department {
  _id: string
  name: string
  code?: string | null
  description?: string | null
  username: string
  createdAt?: string
  demoPassword?: string // only for admin view (plaintext stored temporarily)
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    code: "",
    description: "",
    username: "",
    password: "",
  })
  const [searchTerm, setSearchTerm] = useState("")
  // Unified edit state per department
  const [editing, setEditing] = useState<{ [key: string]: boolean }>({})
  const [editValues, setEditValues] = useState<{
    [key: string]: { name: string; code: string; description: string; username: string; password: string }
  }>({})
  const [showNewPassword, setShowNewPassword] = useState<{ [key: string]: boolean }>({})
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadDepartments()
  }, [])

  async function loadDepartments() {
    try {
      const res = await fetch("/api/departments", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setDepartments(data.departments || [])
      }
    } catch {
      toast({ title: "Error", description: "Failed to load departments", variant: "destructive" })
    }
  }

  async function addDepartment() {
    if (!newDepartment.name || !newDepartment.username || !newDepartment.password) {
      toast({
        title: "Error",
        description: "Department name, username, and password are required",
        variant: "destructive",
      })
      return
    }
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDepartment.name,
          username: newDepartment.username,
          password: newDepartment.password,
          code: newDepartment.code || undefined,
          description: newDepartment.description || undefined,
        }),
      })
      if (res.ok) {
        await loadDepartments()
        setNewDepartment({ name: "", code: "", description: "", username: "", password: "" })
        toast({
          title: "✅ Department Added Successfully!",
          description: "The department can now log in to submit loan applications.",
          duration: 5000,
        })
        setTimeout(() => {
          const manageTab = document.querySelector('[value="manage"]') as HTMLElement
          if (manageTab) manageTab.click()
        }, 1000)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Error", description: data?.error || "Unable to add department", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Unable to add department", variant: "destructive" })
    }
  }

  async function deleteDepartment(id: string) {
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" })
      if (res.ok) {
        await loadDepartments()
        toast({ title: "Success", description: "Department deleted successfully" })
      }
    } catch {
      toast({ title: "Error", description: "Unable to delete department", variant: "destructive" })
    }
  }

  function startEditing(dept: Department) {
    setEditing((prev) => ({ ...prev, [dept._id]: true }))
    setEditValues((prev) => ({
      ...prev,
      [dept._id]: {
        name: dept.name || "",
        code: dept.code || "",
        description: dept.description || "",
        username: dept.username || "",
        password: "",
      },
    }))
  }

  function cancelEditing(id: string) {
    setEditing((prev) => ({ ...prev, [id]: false }))
    setShowNewPassword((prev) => ({ ...prev, [id]: false }))
    setEditValues((prev) => ({ ...prev, [id]: { ...prev[id], password: "" } }))
  }

  function updateEditField(id: string, field: string, value: string) {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  async function saveEdits(id: string) {
    const dept = departments.find((d) => d._id === id)
    const values = editValues[id]
    if (!dept || !values) return

    if (!values.name.trim()) {
      toast({ title: 'Error', description: 'Department name is required', variant: 'destructive' })
      return
    }
    if (!values.username.trim()) {
      toast({ title: 'Error', description: 'Username is required', variant: 'destructive' })
      return
    }

    const payload: Record<string, any> = {}
    if (values.name.trim() !== dept.name) payload.name = values.name.trim()
    if ((values.code || '').trim() !== (dept.code || '')) payload.code = values.code.trim() || undefined
    if ((values.description || '').trim() !== (dept.description || '')) payload.description = values.description.trim() || undefined
    if (values.username.trim() !== dept.username) payload.username = values.username.trim()
    if (values.password.trim()) payload.password = values.password.trim()

    if (Object.keys(payload).length === 0) {
      toast({ title: 'No changes', description: 'Nothing to update', duration: 2000 })
      cancelEditing(id)
      return
    }

    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast({ title: 'Updated', description: 'Department updated successfully' })
        await loadDepartments()
        cancelEditing(id)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data?.error || 'Update failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Unable to update department', variant: 'destructive' })
    }
  }

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Department Management</h2>
          <p className="text-muted-foreground">Manage government departments and their login credentials</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {departments.length} Department{departments.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Tabs defaultValue="add" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Add Department</TabsTrigger>
          <TabsTrigger value="manage">Manage Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Department</CardTitle>
              <CardDescription>Create a new government department with custom login credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dept-name">Department Name</Label>
                  <Input
                    id="dept-name"
                    placeholder="e.g., Agriculture Department"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept-code">Department Code (Optional)</Label>
                  <Input
                    id="dept-code"
                    placeholder="e.g., AGR"
                    value={newDepartment.code}
                    onChange={(e) => setNewDepartment((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dept-username">Username</Label>
                  <Input
                    id="dept-username"
                    placeholder="e.g., agriculture_dept"
                    value={newDepartment.username}
                    onChange={(e) => setNewDepartment((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept-password">Password</Label>
                  <Input
                    id="dept-password"
                    type="password"
                    placeholder="Enter secure password"
                    value={newDepartment.password}
                    onChange={(e) => setNewDepartment((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-description">Description (Optional)</Label>
                <Input
                  id="dept-description"
                  placeholder="Brief description of the department"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={addDepartment} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              {searchTerm && (
                <Badge variant="outline">
                  {filteredDepartments.length} result{filteredDepartments.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {filteredDepartments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? "No departments found matching your search." : "No departments added yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredDepartments.map((dept) => {
                  const isEditing = editing[dept._id]
                  const values = editValues[dept._id]
                  return (
                    <Card key={dept._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            {!isEditing && (
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-lg">{dept.name}</h3>
                                {dept.code && <Badge variant="secondary">{dept.code}</Badge>}
                              </div>
                            )}
                            {isEditing ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input
                                    value={values?.name || ''}
                                    onChange={(e) => updateEditField(dept._id, 'name', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                  <Label className="text-xs">Code</Label>
                                  <Input
                                    value={values?.code || ''}
                                    onChange={(e) => updateEditField(dept._id, 'code', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 col-span-2">
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    value={values?.description || ''}
                                    onChange={(e) => updateEditField(dept._id, 'description', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                  <Label className="text-xs">Username</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={values?.username || ''}
                                      onChange={(e) => updateEditField(dept._id, 'username', e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        navigator.clipboard.writeText(values?.username || '')
                                        toast({ title: 'Copied', description: 'Username copied' })
                                      }}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                  <Label className="text-xs">New Password (optional)</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type={showNewPassword[dept._id] ? 'text' : 'password'}
                                      placeholder="Leave blank to keep existing"
                                      value={values?.password || ''}
                                      onChange={(e) => updateEditField(dept._id, 'password', e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setShowNewPassword((p) => ({ ...p, [dept._id]: !p[dept._id] }))
                                      }
                                    >
                                      {showNewPassword[dept._id] ? 'Hide' : 'Show'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {dept.description && (
                                  <p className="text-sm text-muted-foreground">{dept.description}</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Username</Label>
                                    <div className="flex items-center space-x-2">
                                      <code className="bg-muted px-2 py-1 rounded text-sm">{dept.username}</code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          navigator.clipboard.writeText(dept.username)
                                          toast({ title: 'Copied', description: 'Username copied' })
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Password</Label>
                                    <div className="flex items-center space-x-2">
                                      <code className="bg-muted px-2 py-1 rounded text-sm select-all">
                                        {showPassword[dept._id] ? (dept.demoPassword || 'N/A') : '••••••••••••'}
                                      </code>
                                      {dept.demoPassword && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              setShowPassword(p => ({ ...p, [dept._id]: !p[dept._id] }))
                                            }
                                          >
                                            {showPassword[dept._id] ? (
                                              <EyeOff className="w-3 h-3" />
                                            ) : (
                                              <Eye className="w-3 h-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              navigator.clipboard.writeText(dept.demoPassword || '')
                                              toast({ title: 'Copied', description: 'Password copied' })
                                            }}
                                          >
                                            <Copy className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="default" onClick={() => saveEdits(dept._id)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => cancelEditing(dept._id)}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => startEditing(dept)}>
                                  Edit
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteDepartment(dept._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
