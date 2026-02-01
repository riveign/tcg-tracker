import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import type { AppRouter } from '@tcg-tracker/api/types'

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>()

// Get API URL from environment variables
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Default to localhost in development
  return 'http://localhost:3000'
}

// Create tRPC client
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      headers: () => {
        const token = localStorage.getItem('auth_token')
        return {
          Authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})

// Create React Query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
