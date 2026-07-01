import { useAuthStore } from './store'

const BASE_URL = import.meta.env.VITE_API_BASE || '/api'

interface ApiOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = useAuthStore.getState().token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    return url.toString()
  }

  async request<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options
    const url = this.buildUrl(path, params)
    const response = await fetch(url, {
      ...fetchOptions,
      headers: { ...this.getHeaders(), ...(fetchOptions.headers as Record<string, string>) },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      if (response.status === 401) {
        useAuthStore.getState().logout()
      }
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  get<T>(path: string, options?: ApiOptions) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: unknown, options?: ApiOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) })
  }

  put<T>(path: string, body?: unknown, options?: ApiOptions) {
    return this.request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) })
  }

  delete<T>(path: string, options?: ApiOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient(BASE_URL)
