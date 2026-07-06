import React, { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { marked } from 'marked';

const Guides = () => {
  const [activeTier, setActiveTier] = useState('frontend');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuide = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiCall(`/guides/${activeTier}`);
        if (response.success) {
          setContent(response.content);
        }
      } catch (err) {
        setError(err.message || 'Failed to load guide contents.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [activeTier]);

  // Configure marked options for code rendering
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Dynamic DOM wrapper to add custom CodeBlock style + Copy button to markdown pre tags
  useEffect(() => {
    if (loading || error || !content) return;

    const preElements = document.querySelectorAll('.doc-viewer-container pre');
    preElements.forEach((pre) => {
      // Avoid wrapping multiple times
      if (pre.parentElement.classList.contains('codeblock-body')) return;

      const codeElement = pre.querySelector('code');
      if (!codeElement) return;

      const codeText = codeElement.innerText;

      // Extract code block language
      let lang = 'code';
      const classes = Array.from(codeElement.classList);
      const langClass = classes.find(c => c.startsWith('language-'));
      if (langClass) {
        lang = langClass.replace('language-', '');
      }

      // Create container wrapper
      const container = document.createElement('div');
      container.className = 'custom-codeblock';

      // Create header
      const header = document.createElement('div');
      header.className = 'codeblock-header';

      const langSpan = document.createElement('span');
      langSpan.className = 'codeblock-lang';
      langSpan.innerText = lang;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerText = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(codeText.trim());
        copyBtn.innerText = 'Copied ✓';
        setTimeout(() => {
          copyBtn.innerText = 'Copy';
        }, 2000);
      };

      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      const body = document.createElement('div');
      body.className = 'codeblock-body';
      
      // Clone the code node to preserve code structure/syntax styling
      const codeClone = codeElement.cloneNode(true);
      body.appendChild(codeClone);

      container.appendChild(header);
      container.appendChild(body);

      // Replace the original pre block in DOM
      pre.parentNode.replaceChild(container, pre);
    });
  }, [content, loading, error]);

  return (
    <div className="guides-layout">
      <aside className="guides-sidebar">
        <span className="sidebar-title">Architecture Tiers</span>
        <div className="sidebar-menu">
          <button
            onClick={() => setActiveTier('frontend')}
            className={`sidebar-btn ${activeTier === 'frontend' ? 'active' : ''}`}
          >
            <span>💻</span> Frontend Spec
          </button>
          <button
            onClick={() => setActiveTier('backend')}
            className={`sidebar-btn ${activeTier === 'backend' ? 'active' : ''}`}
          >
            <span>⚙️</span> Backend Spec
          </button>
          <button
            onClick={() => setActiveTier('database')}
            className={`sidebar-btn ${activeTier === 'database' ? 'active' : ''}`}
          >
            <span>🗄️</span> Database Spec
          </button>
        </div>
      </aside>

      <section className="guides-content">
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading guide specs...</div>
        ) : error ? (
          <div className="alert-error" style={{ maxWidth: '600px' }}>{error}</div>
        ) : (
          <div 
            className="doc-viewer-container" 
            dangerouslySetInnerHTML={{ __html: marked.parse(content) }} 
          />
        )}
      </section>
    </div>
  );
};

export default Guides;
