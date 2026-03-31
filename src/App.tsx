import './index.css';
import { AppRouter } from './app/router';

import { AuthProvider } from './shared/lib/auth';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
