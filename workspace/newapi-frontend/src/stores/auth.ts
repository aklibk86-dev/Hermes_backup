import { create } from "zustand"
import { api } from "../lib/api"

interface AuthState {
  user: { id: number; username: string; email: string; role: string; quota: number } | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    const res = await api.post<{ data: { token?: string; user?: { id: number; username: string; email: string; role: string; quota: number } } }>("/api/user/login", { username, password })
    if (res.data.token) api.setToken(res.data.token)
    set({ user: res.data.user || null, isAuthenticated: true })
  },

  logout: () => {
    api.setToken(null)
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = api.getToken()
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }
    try {
      const res = await api.get<{ data: { id: number; username: string; email: string; role: string; quota: number } }>("/api/user/self")
      set({ user: res.data, isAuthenticated: true, isLoading: false })
    } catch {
      api.setToken(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
