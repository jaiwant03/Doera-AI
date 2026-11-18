import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import AnimatedLogo from '../components/UI/AnimatedLogo';
import AuthPinkBackground from '../components/Auth/AuthPinkBackground';
import GoogleSignInButton from '../components/Auth/GoogleSignInButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const { login, resetPassword, user, token, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (token || user)) {
      navigate('/chat', { replace: true });
    }
  }, [token, user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (isResetMode) {
        await resetPassword(email, password);
        setSuccessMsg('Password updated successfully! Redirecting...');
        setTimeout(() => navigate('/chat'), 800);
      } else {
        await login(email, password);
        navigate('/chat');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="doera-auth-page">
      <AuthPinkBackground />
      <div className="doera-auth-card animate-fadeIn">
        {/* Brand Header */}
        <div className="doera-auth-header">
          <div className="doera-auth-badge">
            <span className="doera-live-pulse-dot" />
            <span>AUTONOMOUS AI PLATFORM 2.0</span>
          </div>

          <Link to="/" className="doera-auth-brand-row">
            <AnimatedLogo size="md" state="idle" showAura={true} />
            <span className="doera-auth-brand-name">DOERA AI</span>
          </Link>

          <h2 className="doera-auth-title">
            {isResetMode ? 'Reset Your Password' : 'Welcome Back'}
          </h2>
          <p className="doera-auth-subtitle">
            {isResetMode
              ? 'Enter your email and new password to instantly update your account.'
              : 'Sign in to access your autonomous execution workspace.'}
          </p>
        </div>

        {error && (
          <div className="doera-auth-alert-error animate-fadeIn">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div>{error}</div>
              {!isResetMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                  }}
                  style={{
                    marginTop: '6px',
                    color: '#FF55BD',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'block'
                  }}
                >
                  Forgot or need to update your password? Click here to reset.
                </button>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="doera-auth-alert-error animate-fadeIn" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10B981' }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="doera-form-group">
            <div className="doera-form-label-row">
              <label className="doera-form-label">Email Address</label>
            </div>
            <div className="doera-input-wrapper">
              <Mail size={16} className="doera-input-icon" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abc@gmail.com"
                className="doera-input-control"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="doera-form-group">
            <div className="doera-form-label-row">
              <label className="doera-form-label">
                {isResetMode ? 'New Password (min 6 characters)' : 'Password'}
              </label>
              {!isResetMode && (
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  style={{
                    color: '#FF55BD',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="doera-input-wrapper">
              <Lock size={16} className="doera-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isResetMode ? 'Enter new password' : '••••••••••••'}
                className="doera-input-control"
                autoComplete={isResetMode ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="doera-input-toggle-btn"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="doera-btn-auth-submit"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isResetMode ? (
              <>
                <KeyRound size={16} />
                <span>Update Password & Sign In</span>
              </>
            ) : (
              <>
                <span>Sign In to DOERA</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {!isResetMode && (
          <>
            <div className="doera-auth-divider">
              <span>OR</span>
            </div>
            <GoogleSignInButton onError={(msg) => setError(msg)} />
            <button
              type="button"
              onClick={() => {
                setEmail('judge@doera.ai');
                setPassword('hackathon2026');
              }}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '9px 12px',
                background: 'rgba(45, 212, 191, 0.1)',
                border: '1px solid rgba(45, 212, 191, 0.35)',
                borderRadius: '8px',
                color: '#2DD4BF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>⚡ Fill Demo Judge Account (judge@doera.ai)</span>
            </button>
          </>
        )}

        {isResetMode ? (
          <div className="doera-auth-footer-link">
            Remembered your credentials?
            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#FF55BD',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="doera-auth-footer-link">
            Don't have an account yet?
            <Link to="/signup">Create an Account</Link>
          </div>
        )}

        <div className="doera-auth-trust-badge">
          <ShieldCheck size={13} style={{ color: '#FF55BD' }} />
          <span>Enterprise-Grade 256-Bit TLS Security</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
