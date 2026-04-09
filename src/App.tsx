import './index.css';
import { AppRouter } from './app/router';

import { AuthProvider } from './shared/lib/auth';
import { ToastProvider } from './shared/lib/toast';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
