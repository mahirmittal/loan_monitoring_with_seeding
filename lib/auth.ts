export interface User {
  department: string
  name: string
  loginTime: string
}

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null

  const userData = localStorage.getItem("currentUser")
  return userData ? JSON.parse(userData) : null
}

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser")
  }
}

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null
}
