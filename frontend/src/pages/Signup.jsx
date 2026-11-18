import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, Mail, User, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import AnimatedLogo from '../components/UI/AnimatedLogo';
import AuthPinkBackground from '../components/Auth/AuthPinkBackground';
import GoogleSignInButton from '../components/Auth/GoogleSignInButton';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup, user, token, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (token || user)) {
      navigate('/chat', { replace: true });
    }
  }, [token, user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(name, email, password);
      navigate('/chat');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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

          <h2 className="doera-auth-title">Create your Account</h2>
          <p className="doera-auth-subtitle">
            Deploy autonomous agents that turn requests into real-world results.
          </p>
        </div>

        {error && (
          <div className="doera-auth-alert-error animate-fadeIn">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span>{error}</span>
              {error.toLowerCase().includes('already exists') && (
                <div style={{ marginTop: '6px' }}>
                  <Link 
                    to="/login" 
                    style={{ color: '#FF55BD', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Go to Sign In &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="doera-form-group">
            <label className="doera-form-label">Full Name</label>
            <div className="doera-input-wrapper">
              <User size={16} className="doera-input-icon" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="doera-input-control"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="doera-form-group">
            <label className="doera-form-label">Email Address</label>
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
            <label className="doera-form-label">Password</label>
            <div className="doera-input-wrapper">
              <Lock size={16} className="doera-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="doera-input-control"
                autoComplete="new-password"
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

          <div className="doera-form-group">
            <label className="doera-form-label">Confirm Password</label>
            <div className="doera-input-wrapper">
              <Lock size={16} className="doera-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="doera-input-control"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="doera-input-toggle-btn"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            ) : (
              <>
                <span>Get Started with DOERA AI</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="doera-auth-divider">
          <span>OR</span>
        </div>
        <GoogleSignInButton text="Sign up with Google" onError={(msg) => setError(msg)} />

        <div className="doera-auth-footer-link">
          Already have an account?
          <Link to="/login">Sign In</Link>
        </div>

        <div className="doera-auth-trust-badge">
          <ShieldCheck size={13} style={{ color: '#15966A' }} />
          <span>Protected by Enterprise TLS & Encryption</span>
        </div>
      </div>
    </div>
  );
};

export default Signup;
