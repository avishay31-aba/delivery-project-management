import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  const initialize = useAppStore((s) => s.initialize)
  const hydrated = useAppStore((s) => s.hydrated)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sf-text-muted">
        Loading…
      </div>
    )
  }

  return <RouterProvider router={router} />
}
