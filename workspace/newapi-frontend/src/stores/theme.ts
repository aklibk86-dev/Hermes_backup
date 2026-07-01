import { create } from "zustand"

type Theme = "light" | "dark"

interface ThemeState {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem("theme") as Theme) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),

  toggle: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return { theme: next }
    }),

  setTheme: (t) => {
    localStorage.setItem("theme", t)
    document.documentElement.classList.toggle("dark", t === "dark")
    set({ theme: t })
  },
}))
