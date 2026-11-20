import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  Shield, 
  X, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import './UpgradeModal.css';

const UpgradeModal = ({ 
  isOpen, 
  onClose, 
  currentPlan = 'free', 
  usedRequests = 0, 
  dailyLimit = 20, 
  remainingRequests = 20, 
  resetsIn = '24h 00m', 
  resetAt, 
  onPlanUpdated 
}) => {
  const [activeTier, setActiveTier] = useState(currentPlan || 'free');
  const [selectedPlan, setSelectedPlan] = useState(currentPlan === 'free' ? 'pro' : currentPlan);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [isActivating, setIsActivating] = useState(false);
  const [activatingKey, setActivatingKey] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setActiveTier(currentPlan || 'free');
    setSelectedPlan(currentPlan === 'free' ? 'pro' : currentPlan);
  }, [currentPlan, isOpen]);

  const isLimitReached = remainingRequests <= 0 || usedRequests >= dailyLimit;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('doera_upgrade_dismissed', 'true');
    } catch (_) {}
    onClose();
  };

  const handleRemindTomorrow = () => {
    try {
      sessionStorage.setItem('doera_limit_remind_tomorrow', new Date().toISOString().split('T')[0]);
    } catch (_) {}
    onClose();
  };

  const handleSelectPlan = async (planKey, e) => {
    if (e) e.stopPropagation();
    if (isActivating || planKey === activeTier) return;

    setSelectedPlan(planKey);
    setIsActivating(true);
    setActivatingKey(planKey);
    setNotification(null);

    try {
      const res = await api.post('/subscription/upgrade', {
        plan: planKey,
        billingCycle,
      });
      
      const successMessage = res.data?.message || `Switched to DOERA ${planKey.toUpperCase()}`;
      setNotification({
        type: 'success',
        message: successMessage,
      });

      setActiveTier(planKey);

      if (onPlanUpdated) {
        onPlanUpdated(planKey, res.data?.usage);
      }

      setTimeout(() => {
        setIsActivating(false);
        setActivatingKey(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[DOERA Subscription] Plan switch failed:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Unable to update subscription. Please check your network and try again.',
      });
      setIsActivating(false);
      setActivatingKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="doera-modal-backdrop" onClick={!isActivating ? handleDismiss : undefined}>
      <div 
        className="doera-upgrade-modal animate-fadeIn" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={handleDismiss} 
          className="doera-modal-close-btn" 
          title="Close modal"
          disabled={isActivating}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="doera-upgrade-header">
          <div className="doera-upgrade-badge">
            <Sparkles size={13} style={{ color: '#F52FA8' }} />
            <span>DAILY RENEWABLE INTELLIGENCE TIERS</span>
          </div>

          <h2 className="doera-upgrade-title">
            {isLimitReached ? (
              activeTier === 'max'
                ? "You have reached today's 500-request allowance"
                : activeTier === 'pro'
                ? "Your daily Pro allowance has been used"
                : "Your daily DOERA FREE allowance has been used"
            ) : (
              "Select Your DOERA AI Tier"
            )}
          </h2>

          <p className="doera-upgrade-subtitle">
            {isLimitReached ? (
              activeTier === 'max' ? (
                `You have completed all 500 requests for today. Your capacity automatically refreshes in ${resetsIn}.`
              ) : activeTier === 'pro' ? (
                `You have completed all 300 requests for today. Upgrade to DOERA Max for 500 requests/day, or wait for your daily refresh in ${resetsIn}.`
              ) : (
                `You have used all 20 requests for today. Your allowance automatically resets every day in ${resetsIn}. Upgrade now to continue without pause.`
              )
            ) : (
              "Fresh daily request allowances that renew automatically every day at 00:00 UTC. Switch or cancel anytime."
            )}
          </p>

          {/* Billing Cycle Switcher */}
          <div className="doera-billing-toggle-container">
            <button
              type="button"
              className={`doera-billing-pill ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`doera-billing-pill ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual Billing
              <span className="doera-discount-chip">SAVE 20%</span>
            </button>
          </div>
        </div>

        {/* Real-time Notification Banner */}
        {notification && (
          <div className={`doera-upgrade-banner ${notification.type} animate-fadeIn`}>
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Pricing Cards Grid — All 3 Tiers Selectable & Clickable */}
        <div className="doera-plans-grid">
          {/* 1. FREE TIER */}
          <div 
            className={`doera-plan-card ${activeTier === 'free' ? 'is-current' : ''} ${selectedPlan === 'free' ? 'is-selected' : ''}`}
            onClick={(e) => handleSelectPlan('free', e)}
          >
            <div className="doera-plan-card-top">
              <span className="doera-plan-tier">FREE TIER</span>
              {activeTier === 'free' ? (
                <span className="doera-current-pill">CURRENT TIER</span>
              ) : (
                <span className="doera-switch-pill">CLICK TO SWITCH</span>
              )}
            </div>

            <div className="doera-plan-price">
              <span className="price-currency">$</span>
              <span className="price-amount">0</span>
              <span className="price-period">/ month</span>
            </div>

            <p className="doera-plan-desc">Essential daily AI intelligence that automatically renews every day.</p>
            <div className="doera-plan-divider" />

            <ul className="doera-plan-features">
              <li><Check size={14} className="check-icon" /> <strong>20 Requests / Day</strong> (Auto-resets daily)</li>
              <li><Check size={14} className="check-icon" /> Standard LLaMA 3.3 Intelligence</li>
              <li><Check size={14} className="check-icon" /> Local Service Discovery & Tasks</li>
              <li><Check size={14} className="check-icon" /> Full Conversation History</li>
            </ul>

            <button 
              type="button"
              onClick={(e) => handleSelectPlan('free', e)}
              disabled={isActivating || activeTier === 'free'}
              className={`doera-plan-btn ${activeTier === 'free' ? 'active-tier' : 'selectable'}`}
            >
              {isActivating && activatingKey === 'free' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating Free...</span>
                </>
              ) : activeTier === 'free' ? (
                <span>✓ Active Plan (20/day)</span>
              ) : (
                <>
                  <span>Select Free Tier ($0)</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          {/* 2. DOERA PRO (RECOMMENDED) */}
          <div 
            className={`doera-plan-card featured ${activeTier === 'pro' ? 'is-current' : ''} ${selectedPlan === 'pro' ? 'is-selected' : ''}`}
            onClick={(e) => handleSelectPlan('pro', e)}
          >
            <div className="doera-popular-badge">POPULAR</div>

            <div className="doera-plan-card-top">
              <span className="doera-plan-tier">DOERA PRO</span>
              {activeTier === 'pro' ? (
                <span className="doera-current-pill">CURRENT TIER</span>
              ) : (
                <span className="doera-switch-pill pro">RECOMMENDED</span>
              )}
            </div>

            <div className="doera-plan-price">
              <span className="price-currency">$</span>
              <span className="price-amount">{billingCycle === 'annual' ? '10' : '12'}</span>
              <span className="price-period">/ month</span>
            </div>

            <p className="doera-plan-desc">For active creators and professionals requiring high daily throughput.</p>
            <div className="doera-plan-divider" />

            <ul className="doera-plan-features">
              <li><Check size={14} className="check-icon pro" /> <strong>300 Requests / Day</strong> (Auto-resets daily)</li>
              <li><Check size={14} className="check-icon pro" /> Live Web Research & Real-time Citations</li>
              <li><Check size={14} className="check-icon pro" /> Extended Intelligent Long-term Memory</li>
              <li><Check size={14} className="check-icon pro" /> Multi-File & Document Analysis</li>
              <li><Check size={14} className="check-icon pro" /> Autonomous Multi-Agent Swarm</li>
              <li><Check size={14} className="check-icon pro" /> Voice Input & Synthesis</li>
            </ul>

            <button
              type="button"
              onClick={(e) => handleSelectPlan('pro', e)}
              disabled={isActivating || activeTier === 'pro'}
              className={`doera-plan-btn ${activeTier === 'pro' ? 'active-tier' : 'primary'}`}
            >
              {isActivating && activatingKey === 'pro' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating Pro...</span>
                </>
              ) : activeTier === 'pro' ? (
                <span>✓ Active Plan (300/day)</span>
              ) : (
                <>
                  <span>Upgrade to Pro — $12/mo</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

          {/* 3. DOERA MAX */}
          <div 
            className={`doera-plan-card max-tier ${activeTier === 'max' ? 'is-current' : ''} ${selectedPlan === 'max' ? 'is-selected' : ''}`}
            onClick={(e) => handleSelectPlan('max', e)}
          >
            <div className="doera-max-badge">ENTERPRISE POWER</div>

            <div className="doera-plan-card-top">
              <span className="doera-plan-tier max">DOERA MAX</span>
              {activeTier === 'max' ? (
                <span className="doera-current-pill">CURRENT TIER</span>
              ) : (
                <span className="doera-switch-pill max">MAX POWER</span>
              )}
            </div>

            <div className="doera-plan-price">
              <span className="price-currency">$</span>
              <span className="price-amount">{billingCycle === 'annual' ? '20' : '25'}</span>
              <span className="price-period">/ month</span>
            </div>

            <p className="doera-plan-desc">Maximum execution allowances, n8n automations & deep research.</p>
            <div className="doera-plan-divider" />

            <ul className="doera-plan-features">
              <li><Check size={14} className="check-icon max" /> <strong>500 Requests / Day</strong> (Auto-resets daily)</li>
              <li><Check size={14} className="check-icon max" /> Deep Research & Complex Synthesis</li>
              <li><Check size={14} className="check-icon max" /> Priority Multi-Agent Swarm Orchestration</li>
              <li><Check size={14} className="check-icon max" /> Scheduled n8n Background Automations</li>
              <li><Check size={14} className="check-icon max" /> Project Spaces & Team Memory</li>
              <li><Check size={14} className="check-icon max" /> Instant Priority Queue</li>
            </ul>

            <button
              type="button"
              onClick={(e) => handleSelectPlan('max', e)}
              disabled={isActivating || activeTier === 'max'}
              className={`doera-plan-btn ${activeTier === 'max' ? 'active-tier' : 'max-btn'}`}
            >
              {isActivating && activatingKey === 'max' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating Max...</span>
                </>
              ) : activeTier === 'max' ? (
                <span>✓ Active Plan (500/day)</span>
              ) : (
                <>
                  <span>Upgrade to Max — $25/mo</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions: Remind me tomorrow & Dismiss */}
        <div className="doera-modal-dismiss-area">
          {isLimitReached ? (
            <button 
              type="button" 
              onClick={handleRemindTomorrow} 
              className="doera-btn-maybe-later"
              disabled={isActivating}
            >
              <Clock size={13} style={{ marginRight: 5 }} />
              Remind me tomorrow
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleDismiss} 
              className="doera-btn-maybe-later"
              disabled={isActivating}
            >
              Maybe Later
            </button>
          )}
        </div>

        {/* Security & Guarantee Footer */}
        <div className="doera-upgrade-footer">
          <Shield size={14} style={{ color: '#10B981' }} />
          <span>256-Bit TLS Security • Instant Plan Activation • Daily Limits Auto-Renew Every 24h</span>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
