import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BackendGate from './components/BackendGate';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BatchManager from './pages/BatchManager';
import StagingUpload from './pages/StagingUpload';
import ReceiptBrowser from './pages/ReceiptBrowser';
import ReceiptDetail from './pages/ReceiptDetail';
import VendorPage from './pages/VendorPage';
import Reports from './pages/Reports';
import Exports from './pages/Exports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      // Data stays fresh for 30s — this is a local SQLite DB, no need for constant refetching
      staleTime: 30_000,
      // Offline desktop app — no point refetching on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (offline app)
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BackendGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="batches" element={<BatchManager />} />
              <Route path="batches/:id/stage" element={<StagingUpload />} />
              <Route path="receipts" element={<ReceiptBrowser />} />
              <Route path="receipts/:id" element={<ReceiptDetail />} />
              <Route path="vendors" element={<VendorPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="exports" element={<Exports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BackendGate>
    </QueryClientProvider>
  );
}
