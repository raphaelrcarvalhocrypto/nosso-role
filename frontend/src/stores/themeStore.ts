import { create } from 'zustand'

interface ThemeState {
  isDarkMode: boolean
  toggleTheme: () => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => {
    const newMode = !state.isDarkMode
    document.documentElement.classList.toggle('dark', newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    return { isDarkMode: newMode }
  }),
  initTheme: () => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
    set({ isDarkMode: isDark })
  }
}))