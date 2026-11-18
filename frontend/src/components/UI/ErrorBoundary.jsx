import React from 'react';
import AnimatedLogo from './AnimatedLogo';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DOERA ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div 
          style={{
            minHeight: '260px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            background: 'rgba(21, 16, 24, 0.75)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 85, 189, 0.25)',
            color: '#FFFFFF',
            textAlign: 'center',
            gap: '14px',
            margin: '20px auto',
            maxWidth: '600px'
          }}
        >
          <AnimatedLogo size="sm" state="idle" showAura={true} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Workspace encounter resolved
          </h3>
          <p style={{ fontSize: '13px', color: '#B9AEBE', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
            A temporary rendering event was safely isolated to prevent a blank screen. Your session data and conversation are intact.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FF55BD 0%, #9C52E8 100%)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '6px',
              boxShadow: '0 4px 14px rgba(255, 85, 189, 0.35)'
            }}
          >
            Reload Conversation
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
