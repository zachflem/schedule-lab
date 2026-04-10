import { useState } from 'react';
import { Outlet, Navigate } from 'react-router';
import { Header } from './Header';
import { NavMenu } from './NavMenu';
import { useAuth } from '@/shared/lib/auth';
import { Spinner } from '@/shared/ui';
import './layout.css';

export function Layout() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/unauthorized" replace />;
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="layout">
      <Header onMenuToggle={toggleMenu} isMenuOpen={isMenuOpen} />
      <NavMenu isOpen={isMenuOpen} onClose={closeMenu} />
      
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
