import React from 'react';
import { Link } from 'react-router-dom';
import CodeBlock from '../components/CodeBlock';

const Home = () => {
  return (
    <div className="container">
      <div className="hero-section">
        <h1 className="hero-title">
          Dockerizing the <span className="gradient-text">MERN Stack</span>
        </h1>
        <p className="hero-subtitle">
          A self-documenting reference deployment demonstrating container optimization, 
          persistent storage patterns, and httpOnly JWT session audit logging.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/guides" className="nav-btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
            Read Docker Guides
          </Link>
          <Link to="/login" className="nav-btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-heading)', boxShadow: 'none' }}>
            Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: '4rem' }}>
        <div className="glass-card feature-card">
          <div className="feature-icon">💻</div>
          <h3>Frontend (Vite + React)</h3>
          <p>
            Served using a multi-stage production Nginx container. Features optimized layer caching and runtime URL routing fallbacks.
          </p>
          <Link to="/guides" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Explore Specs →</Link>
        </div>

        <div className="glass-card feature-card">
          <div className="feature-icon">⚙️</div>
          <h3>Backend (Express API)</h3>
          <p>
            Runs under a secure non-root user. Performs dual-write logging (MongoDB and persistent volume JSON-lines log file) for login audit trails.
          </p>
          <Link to="/guides" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Explore Specs →</Link>
        </div>

        <div className="glass-card feature-card">
          <div className="feature-icon">🗄️</div>
          <h3>Database (MongoDB)</h3>
          <p>
            Persisted via named Docker volumes mapping <code>/data/db</code>. Configured with access control roles and directory seeding capabilities.
          </p>
          <Link to="/guides" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Explore Specs →</Link>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '4rem' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Docker CLI Cheatsheet
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Use these commands to build, execute, and monitor container states during development:
        </p>

        <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--color-secondary)' }}>1. Building Container Images</h4>
        <CodeBlock code="docker build -t mern-backend-prod ./backend" />

        <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--color-secondary)' }}>2. Executing with Volume Mounting</h4>
        <CodeBlock code={`# Run backend container, sharing auth-logs-vol volume
docker run -d \\
  -p 5000:5000 \\
  -v auth-logs-vol:/data/logs \\
  --name mern-backend-container \\
  mern-backend-prod`} />

        <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--color-secondary)' }}>3. Stream Container Log Logs</h4>
        <CodeBlock code="docker logs -f mern-backend-container" />

        <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--color-secondary)' }}>4. Clean up Unused Docker Assets</h4>
        <CodeBlock code="docker system prune -a --volumes" />
      </div>
    </div>
  );
};

export default Home;
