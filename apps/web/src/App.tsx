import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { trpc, trpcClient, queryClient } from '@/lib/trpc'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Layout
import { Shell } from '@/components/layout/Shell'

// Pages
import { Collections } from '@/pages/Collections'
import { CollectionDetail } from '@/pages/CollectionDetail'
import { Search } from '@/pages/Search'
import { Scan } from '@/pages/Scan'
import { Complete } from '@/pages/Complete'
import { Build } from '@/pages/Build'
import { Decks } from '@/pages/Decks'
import { DeckDetail } from '@/pages/DeckDetail'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public Route wrapper (redirect to app if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/collections" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/collections" replace />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:id" element={<CollectionDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="scan" element={<Scan />} />
        <Route path="complete" element={<Complete />} />
        <Route path="decks" element={<Decks />} />
        <Route path="decks/:id" element={<DeckDetail />} />
        <Route path="build" element={<Build />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App
