import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Registrar Service Worker para Notificaciones y PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Solo registrar si es localhost o HTTPS seguro (evita errores en IP local de desarrollo)
    const isLocalIP = window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
    
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('✅ Service Worker: Activo y listo.');
    }).catch(error => {
      if (isLocalIP) {
        console.warn('⚠️ PWA: El modo App requiere HTTPS real para instalarse desde esta IP. En producción funcionará sin problemas.');
      } else {
        console.error('❌ PWA Error:', error);
      }
    });
  });
}
