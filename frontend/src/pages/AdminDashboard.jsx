import React, { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';

const AdminDashboard = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [rawFileLogs, setRawFileLogs] = useState([]);
  const [logFilePath, setLogFilePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');

  const fetchActivityData = async () => {
    try {
      const response = await apiCall('/admin/activity');
      if (response.success) {
        setActiveSessions(response.data.activeSessions);
        setHistory(response.data.history);
        setRawFileLogs(response.data.rawFileLogs);
        setLogFilePath(response.data.logFilePath);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
    // Poll logs every 15 seconds to simulate real-time container inspection
    const interval = setInterval(fetchActivityData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ color: 'var(--text-muted)' }}>
        <p>Fetching admin analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert-error" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          {error}
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalAttempts = history.length;
  const activeCount = activeSessions.length;
  const failedAttempts = history.filter(log => log.status === 'failed').length;

  return (
    <div className="container">
      <div className="dashboard-title-bar">
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Audit Control Room</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Inspect MongoDB logs, check derived active sessions, and verify Docker-volume-mounted JSONL logs.
          </p>
        </div>
        <button onClick={fetchActivityData} className="nav-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Refresh ↻
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-label">Active Sessions</div>
          <div className="stat-value" style={{ color: 'var(--color-secondary)' }}>{activeCount}</div>
          <div className="stat-sub">Derived stateless sessions</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">Failed Logins</div>
          <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{failedAttempts}</div>
          <div className="stat-sub">Failed credentials attempts</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">Total Log History</div>
          <div className="stat-value">{totalAttempts}</div>
          <div className="stat-sub">Last 100 MongoDB records</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Active Sessions ({activeCount})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          MongoDB logs ({totalAttempts})
        </button>
        <button
          className={`tab-btn ${activeTab === 'rawFile' ? 'active' : ''}`}
          onClick={() => setActiveTab('rawFile')}
        >
          Persistent Log File (JSONL)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'sessions' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}>Active Sessions</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <strong>Active Session Rule:</strong> Derived on the fly where login was <code>success</code>, logout time is <code>null</code>, and <code>loginAt</code> matches the JWT lifespan window (last 24 hours).
          </p>

          {activeSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No active sessions detected.</p>
          ) : (
            <div className="table-wrapper">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>IP Address</th>
                    <th>User Agent</th>
                    <th>Login Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((session) => (
                    <tr key={session._id}>
                      <td><strong style={{ color: 'var(--text-heading)' }}>{session.username}</strong></td>
                      <td><code>{session.ip}</code></td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.userAgent}>
                        {session.userAgent}
                      </td>
                      <td>{new Date(session.loginAt).toLocaleString()}</td>
                      <td>
                        <span className="badge badge-active">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}>Database Historical Logs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            MongoDB serves as the high-performance index store for the auth-logs dataset.
          </p>

          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No audit history found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>IP Address</th>
                    <th>Date & Time</th>
                    <th>Duration / Logout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => {
                    const loginDate = new Date(log.loginAt);
                    let logoutStatusText = '-';
                    if (log.status === 'success' && !log.logoutAt) {
                      logoutStatusText = 'Active Session';
                    } else if (log.logoutAt) {
                      const minutesDiff = Math.max(1, Math.round((new Date(log.logoutAt) - loginDate) / 60000));
                      logoutStatusText = `Logged out (${minutesDiff}m)`;
                    }
                    
                    return (
                      <tr key={log._id}>
                        <td><strong style={{ color: 'var(--text-heading)' }}>{log.username}</strong></td>
                        <td><code>{log.ip}</code></td>
                        <td>{loginDate.toLocaleString()}</td>
                        <td style={{ color: log.logoutAt ? 'var(--text-muted)' : 'var(--color-secondary)' }}>
                          {logoutStatusText}
                        </td>
                        <td>
                          <span className={`badge badge-${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rawFile' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.25rem' }}>Raw Audit Log file</h3>
          <span className="raw-log-path">File path inside backend: <code>{logFilePath}</code></span>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            This panel shows the raw data written to the container volume. Because it is written in newline-delimited JSON format (JSON-lines), log shippers can stream it without parsing the whole file. Showing the last 50 entries.
          </p>

          <div className="raw-log-viewer">
            {rawFileLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No file lines recorded yet.</p>
            ) : (
              rawFileLogs.map((log, index) => (
                <div key={index} className="raw-log-line" style={{ color: log.action === 'login_failed' ? 'hsl(0, 100%, 75%)' : log.action === 'logout' ? 'var(--text-muted)' : 'var(--color-secondary)' }}>
                  {JSON.stringify(log)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
