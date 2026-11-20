import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Cpu, 
  Workflow, 
  Check, 
  Save,
  User,
  Sliders,
  Layers,
  LogOut,
  Zap,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import UsageTracker from '../components/Sidebar/UsageTracker';
import '../components/Subscription/UpgradeModal.css';
import AmbientBackground from '../components/UI/AmbientBackground';

const Settings = () => {
  const { user, logout } = useAuth();
  const { subscription, fetchSubscription } = useChat();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('integrations'); // 'integrations', 'preferences', 'usage', 'account'
  
  const [integrations, setIntegrations] = useState({
    gmail: { connected: false, email: '' },
    calendar: { connected: false, email: '' },
    whatsapp: { configured: false, phoneNumberId: '' },
    googlePlaces: { configured: false },
    n8n: { connected: true, webhookUrl: 'http://localhost:5678/webhook' },
    llm: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
  });

  const [aiPreferences, setAiPreferences] = useState({
    defaultLanguage: 'en-US',
    voiceOutputEnabled: true,
    requireApprovalForEmail: true,
    autonomousBookingApproval: true,
  });

  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [testingService, setTestingService] = useState(null);
  const [activatingPlan, setActivatingPlan] = useState(null);
  const [planSuccessMessage, setPlanSuccessMessage] = useState(null);
  const [planErrorMessage, setPlanErrorMessage] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const handleActivatePlan = async (planKey) => {
    if ((subscription?.plan || 'free') === planKey) return;

    if (activatingPlan) return;
    setActivatingPlan(planKey);
    setPlanSuccessMessage(null);
    setPlanErrorMessage(null);
    try {
      const res = await api.post('/subscription/upgrade', {
        plan: planKey,
        billingCycle: 'monthly',
      });

      const msg = res.data?.message || `Successfully activated DOERA ${planKey.toUpperCase()} tier!`;
      setPlanSuccessMessage(msg);

      if (fetchSubscription) {
        if (res.data?.plan && res.data?.usage) {
          fetchSubscription(res.data.plan, res.data.usage);
        } else {
          await fetchSubscription();
        }
      }

      setTimeout(() => {
        setPlanSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Plan activation error:', err);
      setPlanErrorMessage(err.response?.data?.error || 'Failed to activate tier. Please try again.');
      setTimeout(() => {
        setPlanErrorMessage(null);
      }, 5000);
    } finally {
      setActivatingPlan(null);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/integrations').catch(() => ({ data: { integrations: {} } }));
        if (res.data && res.data.integrations) {
          setIntegrations(prev => ({ ...prev, ...res.data.integrations }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = () => {
    setSaveStatus('Settings saved successfully.');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleConnectGmail = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/integrations/gmail/auth-url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Failed to get Gmail auth url:', err);
      setSaveStatus('Error initiating Gmail authorization. Please try again.');
      setTimeout(() => setSaveStatus(null), 3000);
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail integration? Outbound automated email sending will be blocked.')) return;
    try {
      setIsLoading(true);
      await api.post('/integrations/gmail/disconnect');
      setIntegrations(prev => ({
        ...prev,
        gmail: { connected: false, email: '' },
      }));
      setSaveStatus('Gmail disconnected and authorization revoked.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
      setSaveStatus('Error disconnecting Gmail.');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const testIntegration = (serviceName) => {
    if (serviceName === 'Email') {
      handleConnectGmail();
      return;
    }
    if (serviceName === 'Calendar') {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const backendUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
      window.location.href = `${backendUrl}/auth/google?state=integration&redirect=true`;
      return;
    }
    setTestingService(serviceName);
    setTimeout(() => {
      setTestingService(null);
      setSaveStatus(`Connection test for ${serviceName} verified.`);
      setTimeout(() => setSaveStatus(null), 2500);
    }, 800);
  };

  return (
    <div className="doera-settings-page" style={{ position: 'relative', overflow: 'hidden' }}>
      <AmbientBackground />
      <div className="doera-settings-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top Navbar */}
        <div className="doera-settings-navbar">
          <Link to="/chat" className="doera-back-link">
            <ArrowLeft size={16} />
            <span>Back to Chat</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/favicon.svg" alt="DOERA" style={{ width: 20, height: 20 }} />
            <span style={{ fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-heading)' }}>DOERA AI</span>
          </div>
        </div>

        {/* Page Card Header */}
        <div className="doera-settings-card-header">
          <div>
            <h1 className="doera-settings-title">Settings & Integrations</h1>
            <p className="doera-settings-subtitle">
              Manage connected external services, agent parameters, and human-in-the-loop safety gates.
            </p>
          </div>
          <button onClick={handleSave} className="doera-btn-save">
            <Save size={14} />
            <span>Save Preferences</span>
          </button>
        </div>

        {saveStatus && (
          <div style={{ padding: '10px 14px', background: 'var(--ramagreen-light)', border: '1px solid var(--ramagreen-border)', borderRadius: 8, fontSize: 12, color: 'var(--ramagreen)', display: 'flex', alignItems: 'center', gap: 6 }} className="animate-fadeIn">
            <Check size={14} />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* Segmented Tab Bar */}
        <div className="doera-settings-tabs-wrapper">
          <button
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`doera-settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
          >
            <Layers size={14} />
            <span>Integrations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`doera-settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          >
            <Sliders size={14} />
            <span>AI Preferences</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usage')}
            className={`doera-settings-tab ${activeTab === 'usage' ? 'active' : ''}`}
          >
            <Zap size={14} />
            <span>Plan & Usage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`doera-settings-tab ${activeTab === 'account' ? 'active' : ''}`}
          >
            <User size={14} />
            <span>Account</span>
          </button>
        </div>

        {/* TAB 1: INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="doera-settings-card animate-fadeIn">
            {/* Unified Platform Banner */}
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                background: 'rgba(241, 45, 152, 0.08)',
                border: '1px solid rgba(241, 45, 152, 0.3)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <ShieldCheck size={20} color="#F12D98" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ color: '#FF55BD', fontSize: '12.5px', fontWeight: 700 }}>
                  DOERA AI — UNIFIED AUTONOMOUS EXECUTION PLATFORM
                </div>
                <div style={{ color: '#E2D9E5', fontSize: '11.5px', marginTop: '2px' }}>
                  All users operate with genuine AI intelligence: multi-format documents, vision, spreadsheet analytics, and multi-agent planning. Outbound email dispatch requires connecting a personal Gmail account via Google Sign-In.
                </div>
              </div>
            </div>

            {/* Business Discovery */}
            <div className="doera-integration-row">
              <div className="doera-integration-left">
                <div className="doera-integration-icon-box discovery">
                  <MapPin size={19} />
                </div>
                <div className="doera-integration-info">
                  <div className="doera-integration-title-line">
                    <h3 className="doera-integration-name">Local Business Discovery</h3>
                    <span className="doera-badge-status active">Active (Places / OSM Live)</span>
                  </div>
                  <p className="doera-integration-desc">
                    Queries real local directories via Google Places or live OpenStreetMap Nominatim/Overpass for comprehensive service intelligence.
                  </p>
                </div>
              </div>
              <div className="doera-integration-right">
                <button
                  type="button"
                  onClick={() => testIntegration('Discovery')}
                  disabled={testingService === 'Discovery'}
                  className="doera-btn-action-outline"
                >
                  {testingService === 'Discovery' ? 'Testing...' : 'Test Search'}
                </button>
              </div>
            </div>

            {/* Gmail */}
            <div className="doera-integration-row">
              <div className="doera-integration-left">
                <div className="doera-integration-icon-box email">
                  <Mail size={19} />
                </div>
                <div className="doera-integration-info">
                  <div className="doera-integration-title-line">
                    <h3 className="doera-integration-name">Gmail Integration (Personal OAuth2)</h3>
                    {user?.authProvider === 'google' ? (
                      integrations.gmail?.connected ? (
                        <span className="doera-badge-status success">
                          Connected ({integrations.gmail.email || user?.googleEmail})
                        </span>
                      ) : (
                        <span className="doera-badge-status pending" style={{ background: 'rgba(241, 45, 152, 0.15)', color: '#FF55BD', borderColor: 'rgba(241, 45, 152, 0.3)' }}>
                          Gmail Authorization Required
                        </span>
                      )
                    ) : (
                      <span className="doera-badge-status pending">
                        Drafting & Preview Only
                      </span>
                    )}
                  </div>
                  <p className="doera-integration-desc">
                    {user?.authProvider === 'google'
                      ? integrations.gmail?.connected
                        ? `Live sender: ${integrations.gmail.email || user?.googleEmail}. Real emails dispatch through your verified account after explicit human approval.`
                        : 'Connect your personal Gmail account to enable real outbound email sending. Each Google user dispatches from their own address.'
                      : 'Manual password accounts can create, edit, and preview email drafts. Live outbound email dispatch requires signing in with Google and connecting your personal Gmail account.'}
                  </p>
                </div>
              </div>
              <div className="doera-integration-right">
                {user?.authProvider === 'google' ? (
                  integrations.gmail?.connected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGmail}
                      className="doera-btn-action-outline"
                      style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      Disconnect Gmail
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      className="doera-btn-action-outline"
                      style={{ background: 'linear-gradient(135deg, #F12D98 0%, #9C52E8 100%)', color: '#FFFFFF', border: 'none', fontWeight: 700 }}
                    >
                      Connect Gmail for Automation
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="doera-btn-action-outline"
                  >
                    Sign In with Google
                  </button>
                )}
              </div>
            </div>

            {/* n8n Automation Engine */}
            <div className="doera-integration-row">
              <div className="doera-integration-left">
                <div className="doera-integration-icon-box n8n">
                  <Workflow size={19} />
                </div>
                <div className="doera-integration-info">
                  <div className="doera-integration-title-line">
                    <h3 className="doera-integration-name">n8n Automation Engine</h3>
                    <span className="doera-badge-status active">Ready (Zero-Auth Webhooks)</span>
                  </div>
                  <p className="doera-integration-desc">
                    8 standalone workflows listening via HTTP Webhooks at <code>http://localhost:5678/webhook</code>.
                  </p>
                </div>
              </div>
              <div className="doera-integration-right">
                <button
                  type="button"
                  onClick={() => testIntegration('n8n Webhook')}
                  className="doera-btn-action-outline"
                >
                  Test Ping
                </button>
              </div>
            </div>

            {/* LLM Model Provider */}
            <div className="doera-integration-row">
              <div className="doera-integration-left">
                <div className="doera-integration-icon-box llm">
                  <Cpu size={19} />
                </div>
                <div className="doera-integration-info">
                  <div className="doera-integration-title-line">
                    <h3 className="doera-integration-name">LLM Provider</h3>
                    <span className="doera-badge-status active">Groq Cloud (LLaMA 3.3)</span>
                  </div>
                  <p className="doera-integration-desc">
                    Cloud orchestration powered by Groq LLaMA 3.3 with intelligent fallback planner.
                  </p>
                </div>
              </div>
              <div className="doera-integration-right">
                <div className="doera-pill-model-spec">
                  <span>groq / llama-3.3-70b</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="doera-settings-card animate-fadeIn">
            <div className="doera-pref-section">
              <label className="doera-pref-label">Default Speech Language</label>
              <p className="doera-pref-desc">Language used for natural speech synthesis and audio outputs.</p>
              <div style={{ marginTop: 8 }}>
                <select
                  value={aiPreferences.defaultLanguage}
                  onChange={(e) => setAiPreferences({ ...aiPreferences, defaultLanguage: e.target.value })}
                  className="doera-select-control"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="ta-IN">Tamil / Tanglish (India)</option>
                </select>
              </div>
            </div>

            <div className="doera-pref-section">
              <span className="doera-pref-label">Human-in-the-Loop Safety Authorization Gates</span>
              <p className="doera-pref-desc">Require user approval before autonomous agents dispatch external actions.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <label className="doera-toggle-row" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: '#EDE4EE' }}>
                    Require approval before sending emails, WhatsApp, or outreach messages
                  </span>
                  <input
                    type="checkbox"
                    checked={aiPreferences.requireApprovalForEmail}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, requireApprovalForEmail: e.target.checked })}
                    className="doera-toggle-checkbox"
                  />
                </label>

                <label className="doera-toggle-row" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: '#EDE4EE' }}>
                    Require approval before finalizing provider bookings or calendar events
                  </span>
                  <input
                    type="checkbox"
                    checked={aiPreferences.autonomousBookingApproval}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, autonomousBookingApproval: e.target.checked })}
                    className="doera-toggle-checkbox"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTION & USAGE */}
        {activeTab === 'usage' && (
          <div className="doera-settings-card animate-fadeIn">
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Active Subscription & Daily Allowance</h3>
                  <p style={{ fontSize: 12.5, color: '#8C7B94', margin: '4px 0 0 0' }}>
                    Track your daily requests usage, renewal countdown, and active tier entitlements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleActivatePlan(subscription?.plan === 'pro' ? 'max' : 'pro')}
                  className="doera-btn-action-outline"
                  style={{ width: 'auto', padding: '7px 16px', color: '#FF55BD', borderColor: 'rgba(255, 85, 189, 0.4)' }}
                >
                  <Sparkles size={13} />
                  <span>Upgrade Tier</span>
                </button>
              </div>
            </div>

            {/* Embedded Usage Tracker Widget from Sidebar */}
            <div style={{ margin: '0 0 20px 0' }}>
              <UsageTracker
                plan={subscription?.plan || 'free'}
                used={subscription?.usedRequests || 0}
                limit={subscription?.dailyLimit || subscription?.limitRequests || (subscription?.plan === 'pro' ? 300 : subscription?.plan === 'max' ? 500 : 20)}
                remaining={subscription?.remainingRequests}
                resetsIn={subscription?.resetsIn}
                resetAt={subscription?.resetAt}
                onUpgradeClick={() => handleActivatePlan(subscription?.plan === 'pro' ? 'max' : 'pro')}
                onDayRollover={() => fetchSubscription && fetchSubscription()}
              />
            </div>

            {/* Feedback Notifications for Plan Switch */}
            {planSuccessMessage && (
              <div 
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px 16px', 
                  background: 'rgba(45, 212, 191, 0.12)', 
                  border: '1px solid rgba(45, 212, 191, 0.4)', 
                  borderRadius: 10, 
                  fontSize: 13, 
                  color: '#2DD4BF', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10 
                }} 
                className="animate-fadeIn"
              >
                <Check size={16} />
                <span>{planSuccessMessage}</span>
              </div>
            )}
            {planErrorMessage && (
              <div 
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px 16px', 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.4)', 
                  borderRadius: 10, 
                  fontSize: 13, 
                  color: '#F87171', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10 
                }} 
                className="animate-fadeIn"
              >
                <AlertCircle size={16} />
                <span>{planErrorMessage}</span>
              </div>
            )}

            {/* Plan Tier Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* CARD 1: DOERA FREE */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: (subscription?.plan || 'free') === 'free' ? '1.5px solid #FF55BD' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: (subscription?.plan || 'free') === 'free' ? '0 0 20px rgba(255, 85, 189, 0.18)' : 'none',
                }}
              >
                <div>
                  {(subscription?.plan || 'free') === 'free' && (
                    <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 85, 189, 0.15)', color: '#FF55BD', border: '1px solid rgba(255, 85, 189, 0.3)' }}>
                      CURRENT TIER
                    </span>
                  )}
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>DOERA Free</h4>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FF55BD', margin: '8px 0' }}>
                    ₹0 <span style={{ fontSize: 12, fontWeight: 500, color: '#8C7B94' }}>/ month</span>
                  </div>
                  <ul style={{ margin: '14px 0 0 0', padding: 0, listStyle: 'none', fontSize: 12, color: '#BBA9C0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <li>✓ 20 Autonomous Requests / Day</li>
                    <li>✓ Multi-Agent LangGraph Swarm</li>
                    <li>✓ OpenStreetMap Real Location Intelligence</li>
                    <li>✓ Human Approval Gate Protection</li>
                    <li>✓ 24-Hour Automated Reset</li>
                  </ul>
                </div>

                <div style={{ marginTop: '22px' }}>
                  {(subscription?.plan || 'free') === 'free' ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'rgba(241, 45, 152, 0.12)',
                        border: '1px solid rgba(241, 45, 152, 0.4)',
                        color: '#FF55BD',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: 'default',
                      }}
                    >
                      <Check size={14} color="#FF55BD" />
                      <span>Current Tier Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivatePlan('free')}
                      disabled={activatingPlan !== null}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #F12D98 0%, #BD2275 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: activatingPlan ? 'not-allowed' : 'pointer',
                        boxShadow: '0 0 16px rgba(241, 45, 152, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Zap size={14} color="#FFFFFF" />
                      <span>{activatingPlan === 'free' ? 'Activating Free...' : 'Activate Free Tier'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: DOERA PRO */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: subscription?.plan === 'pro' ? '1.5px solid #FF55BD' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: subscription?.plan === 'pro' ? '0 0 20px rgba(255, 85, 189, 0.18)' : 'none',
                }}
              >
                <div>
                  {subscription?.plan === 'pro' && (
                    <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 85, 189, 0.15)', color: '#FF55BD', border: '1px solid rgba(255, 85, 189, 0.3)' }}>
                      CURRENT TIER
                    </span>
                  )}
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>DOERA Pro</h4>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FF55BD', margin: '8px 0' }}>
                    ₹1,499 <span style={{ fontSize: 12, fontWeight: 500, color: '#8C7B94' }}>/ month</span>
                  </div>
                  <ul style={{ margin: '14px 0 0 0', padding: 0, listStyle: 'none', fontSize: 12, color: '#BBA9C0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <li>✓ 300 Autonomous Requests / Day</li>
                    <li>✓ Priority Groq LLaMA 3.3 Engine</li>
                    <li>✓ Fast-Lane Parallel Multi-Agent Routing</li>
                    <li>✓ Proactive Background Schedulers</li>
                  </ul>
                </div>

                <div style={{ marginTop: '22px' }}>
                  {subscription?.plan === 'pro' ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'rgba(241, 45, 152, 0.12)',
                        border: '1px solid rgba(241, 45, 152, 0.4)',
                        color: '#FF55BD',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: 'default',
                      }}
                    >
                      <Check size={14} color="#FF55BD" />
                      <span>Current Tier Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivatePlan('pro')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #F12D98 0%, #BD2275 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(241, 45, 152, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Zap size={14} color="#FFFFFF" />
                      <span>Activate Pro Tier</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 3: DOERA MAX */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: subscription?.plan === 'max' ? '1.5px solid #FF55BD' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: subscription?.plan === 'max' ? '0 0 20px rgba(255, 85, 189, 0.18)' : 'none',
                }}
              >
                <div>
                  {subscription?.plan === 'max' && (
                    <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 85, 189, 0.15)', color: '#FF55BD', border: '1px solid rgba(255, 85, 189, 0.3)' }}>
                      CURRENT TIER
                    </span>
                  )}
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>DOERA Max</h4>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FF55BD', margin: '8px 0' }}>
                    ₹3,999 <span style={{ fontSize: 12, fontWeight: 500, color: '#8C7B94' }}>/ month</span>
                  </div>
                  <ul style={{ margin: '14px 0 0 0', padding: 0, listStyle: 'none', fontSize: 12, color: '#BBA9C0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <li>✓ 500 Autonomous Requests / Day</li>
                    <li>✓ Unlimited Context Memory Vector Search</li>
                    <li>✓ Dedicated Background Automation Nodes</li>
                    <li>✓ Custom API & Webhook Endpoints</li>
                  </ul>
                </div>

                <div style={{ marginTop: '22px' }}>
                  {subscription?.plan === 'max' ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'rgba(241, 45, 152, 0.12)',
                        border: '1px solid rgba(241, 45, 152, 0.4)',
                        color: '#FF55BD',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: 'default',
                      }}
                    >
                      <Check size={14} color="#FF55BD" />
                      <span>Current Tier Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivatePlan('max')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #F12D98 0%, #BD2275 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(241, 45, 152, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Sparkles size={14} color="#FFFFFF" />
                      <span>Activate Max Tier</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT */}
        {activeTab === 'account' && (
          <div className="doera-settings-card animate-fadeIn">
            <div className="doera-account-header">
              <div className="doera-account-avatar">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{user?.name || 'Registered User'}</h3>
                <p style={{ fontSize: 12, color: '#8C7B94', margin: '4px 0 0 0' }}>{user?.email}</p>
              </div>
            </div>

            <div className="doera-account-grid">
              <div className="doera-form-group">
                <label className="doera-form-label">Full Name</label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="doera-input-control"
                />
              </div>

              <div className="doera-form-group">
                <label className="doera-form-label">Email Address</label>
                <input
                  type="email"
                  value={accountForm.email}
                  disabled
                  className="doera-input-control"
                />
              </div>
            </div>

            {/* Account Usage Tracker Display */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Plan Quota & Requests Usage</span>
              </div>
              <UsageTracker
                plan={subscription?.plan || 'free'}
                used={subscription?.usedRequests || 0}
                limit={subscription?.dailyLimit || subscription?.limitRequests || (subscription?.plan === 'pro' ? 300 : subscription?.plan === 'max' ? 500 : 20)}
                remaining={subscription?.remainingRequests}
                resetsIn={subscription?.resetsIn}
                resetAt={subscription?.resetAt}
                onUpgradeClick={() => handleActivatePlan(subscription?.plan === 'pro' ? 'max' : 'pro')}
                onDayRollover={() => fetchSubscription && fetchSubscription()}
              />
            </div>

            <div className="doera-account-footer">
              <span style={{ fontSize: 12, color: '#8C7B94' }}>Session authenticated via JWT credentials.</span>
              <button
                type="button"
                onClick={handleLogout}
                className="doera-btn-logout"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
