import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// === Wallet & Query Setup ===
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './wagmi.config';
import '@rainbow-me/rainbowkit/styles.css';

// Create React Query client (with sensible defaults)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            lightMode: lightTheme(),
            darkMode: darkTheme({
              accentColor: '#a855f7', // neon-purple
              borderRadius: 'large',
            }),
          }}
          modalSize="wide"
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);