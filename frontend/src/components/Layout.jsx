import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <p>© 2026 MERN Docker reference application. All rights reserved.</p>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
          Persisted container state demonstration.
        </p>
      </footer>
    </div>
  );
};

export default Layout;
