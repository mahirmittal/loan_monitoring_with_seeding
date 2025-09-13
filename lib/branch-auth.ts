interface BranchAuth {
  username: string
  bankName: string
  branchName: string
  loginTime: string
}

export const getBranchAuth = (): BranchAuth | null => {
  if (typeof window === "undefined") return null

  const branchAuth = localStorage.getItem("branchAuth")
  if (!branchAuth) return null

  try {
    return JSON.parse(branchAuth)
  } catch {
    return null
  }
}

export const setBranchAuth = (auth: BranchAuth) => {
  localStorage.setItem("branchAuth", JSON.stringify(auth))
}

export const clearBranchAuth = () => {
  localStorage.removeItem("branchAuth")
}

export const isBranchAuthenticated = (): boolean => {
  return getBranchAuth() !== null
}
