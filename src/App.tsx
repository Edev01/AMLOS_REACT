import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

/**
 * Root Application Component
 * Wraps the app with authentication contexts and global providers.
 * Routing is modularized inside the `src/routes/AppRoutes.tsx` file.
 */
function App() {
  return (
    <AuthProvider>
      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        containerStyle={{ top: 96, right: 28 }}
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      {/* Application Modular Routes */}
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
