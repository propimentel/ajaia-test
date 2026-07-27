import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { getOrCreateAnonUserId } from '@/lib/anon-user';
import { App } from './App';
import './index.css';

getOrCreateAnonUserId();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  </React.StrictMode>,
);
