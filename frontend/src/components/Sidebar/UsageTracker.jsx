import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import './UsageTracker.css';

const UsageTracker = ({
  plan = 'free',
  used = 0,
  limit = 20,
  remaining: customRemaining,
  resetsIn: initialResetsIn,
  resetAt,
  onUpgradeClick,
  onDayRollover,
}) => {
  const safeLimit = Number(limit) > 0 ? Number(limit) : (plan === 'pro' ? 300 : plan === 'max' ? 500 : 20);
  const safeUsed = Math.max(0, Number(used) || 0);
  const remaining = customRemaining !== undefined ? customRemaining : Math.max(0, safeLimit - safeUsed);
  const percent = Math.min(100, Math.round((safeUsed / safeLimit) * 100));

  const [resetsIn, setResetsIn] = useState(initialResetsIn || '24h 00m');

  useEffect(() => {
    const calculateCountdown = () => {
      let target;
      if (resetAt) {
        target = new Date(resetAt).getTime();
      } else {
        const d = new Date();
        target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0)).getTime();
      }

      const now = Date.now();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setResetsIn('00h 00m');
        if (onDayRollover) onDayRollover();
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setResetsIn(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 30000);
    return () => clearInterval(interval);
  }, [resetAt, onDayRollover]);

  return (
    <div className="doera-usage-tracker-box">
      <div className="doera-usage-row-top">
        <span className="doera-usage-plan-tag">DOERA {plan.toUpperCase()}</span>
        <span className="doera-usage-counts">{safeUsed} / {safeLimit} requests used</span>
      </div>

      <div className="doera-usage-progress-bar">
        <div
          className={`doera-usage-progress-fill ${percent >= 100 ? 'exhausted' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="doera-usage-row-middle">
        <span className="doera-usage-remaining">{remaining} remaining</span>
        <span className="doera-usage-reset-time">
          <Clock size={10} className="doera-clock-icon" />
          <span>Resets in {resetsIn}</span>
        </span>
      </div>

      <div className="doera-usage-row-bottom">
        <button type="button" onClick={onUpgradeClick} className="doera-usage-upgrade-link">
          <span>Manage Plan</span>
          <ArrowUpRight size={11} />
        </button>
      </div>
    </div>
  );
};

export default UsageTracker;
