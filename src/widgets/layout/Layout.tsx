import { useState } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { NavMenu } from './NavMenu';
import './layout.css';

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
