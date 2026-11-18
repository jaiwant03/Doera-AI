import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="doera-auth-page">
      <div className="doera-auth-card" style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--rose-light)', color: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <AlertCircle size={22} />
        </div>
        <h1 className="doera-auth-title">404 - Page Not Found</h1>
        <p className="doera-auth-subtitle" style={{ marginTop: 6, marginBottom: 20 }}>
          The requested page does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="doera-btn-auth-submit"
          style={{ textDecoration: 'none', display: 'inline-flex' }}
        >
          <ArrowLeft size={14} />
          <span>Return to Workspace</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
