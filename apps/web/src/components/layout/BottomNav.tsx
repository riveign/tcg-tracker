import { Link, useLocation } from 'react-router-dom'
import { Library, ScanLine, List, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Collections',
    icon: Library,
    path: '/collections',
  },
  {
    label: 'Scan',
    icon: ScanLine,
    path: '/scan',
  },
  {
    label: 'Complete',
    icon: List,
    path: '/complete',
  },
  {
    label: 'Build',
    icon: Layers,
    path: '/build',
  },
]

export const BottomNav = () => {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background-surface border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
