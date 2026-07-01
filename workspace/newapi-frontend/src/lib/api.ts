const API_BASE = import.meta.env.VITE_API_URL || "https://api.wf1.one"

export interface ApiError {
  error: { message: string; type?: string; code?: string }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) localStorage.setItem("api_token", token)
    else localStorage.removeItem("api_token")
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem("api_token")
    return this.token
  }

  private async request<T>(method: string, path: string, data?: unknown, opts?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = this.getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...opts,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
      throw new Error((err as ApiError).error?.message || `HTTP ${res.status}`)
    }

    return res.json()
  }

  get<T>(path: string) { return this.request<T>("GET", path) }
  post<T>(path: string, data?: unknown) { return this.request<T>("POST", path, data) }
  put<T>(path: string, data?: unknown) { return this.request<T>("PUT", path, data) }
  delete<T>(path: string) { return this.request<T>("DELETE", path) }

  // Streaming for chat
  async streamChat(path: string, body: unknown, onChunk: (text: string) => void): Promise<string> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    }
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Chat error: ${res.status}`)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let full = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data)
            const text = parsed.choices?.[0]?.delta?.content ||
                         parsed.choices?.[0]?.text || ""
            if (text) {
              full += text
              onChunk(text)
            }
          } catch { /* skip parse errors */ }
        }
      }
    }
    return full
  }
}

export const api = new ApiClient()

// API response types
export interface ApiListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface Token {
  id: number
  name: string
  key: string
  created_at: string
  status: boolean
  used_quota: number
  remaining_quota: number
  unlimited_quota: boolean
  models: string[]
}

export interface User {
  id: number
  username: string
  email: string
  role: string
  status: boolean
  quota: number
  used_quota: number
  group: string
  created_at: string
}

export interface Channel {
  id: number
  name: string
  type: number
  status: boolean
  models: string[]
  balance: number
  created_at: string
}

export interface Model {
  id: number
  name: string
  model: string
  enabled: boolean
  price: number
  ratio: number
  type: string
}

export interface Stats {
  total_users?: number
  total_tokens?: number
  total_requests?: number
  total_quota?: number
  today_requests?: number
  today_quota?: number
}
