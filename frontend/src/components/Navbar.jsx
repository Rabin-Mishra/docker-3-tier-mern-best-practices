import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="nav-container">
      <Link to="/" className="logo-link">
        <span>🐳</span>
        <span>MERN<span className="logo-accent">Docker</span></span>
      </Link>
      
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          Home
        </NavLink>
        <NavLink to="/guides" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          Docker Guides
        </NavLink>
        
        {user && user.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Admin Logs
          </NavLink>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Logged in as <strong style={{ color: 'var(--text-heading)' }}>{user.username}</strong>
            </span>
            <button onClick={handleLogout} className="nav-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-heading)', boxShadow: 'none' }}>
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="nav-btn">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
