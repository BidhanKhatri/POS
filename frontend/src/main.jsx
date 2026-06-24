import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ThemeProvider from './theme/ThemeProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoadingProvider } from './context/LoadingContext.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  5 * 60 * 1000,
      gcTime:     10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <LoadingProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </LoadingProvider>,
)
