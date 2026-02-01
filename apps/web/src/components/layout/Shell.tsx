import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export const Shell = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
