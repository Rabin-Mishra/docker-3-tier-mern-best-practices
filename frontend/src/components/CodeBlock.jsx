import React, { useState } from 'react';

const CodeBlock = ({ code, language = 'bash' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="custom-codeblock">
      <div className="codeblock-header">
        <span className="codeblock-lang">{language}</span>
        <button onClick={handleCopy} className="copy-btn">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <div className="codeblock-body">{code.trim()}</div>
    </div>
  );
};

export default CodeBlock;
