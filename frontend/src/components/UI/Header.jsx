import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import AnimatedLogo from './AnimatedLogo';

const Header = ({ onOpenSidebar }) => {
  const { createNewConversation } = useChat();

  return (
    <header className="doera-mobile-header">
      <div className="doera-mobile-header-left">
        <button
          onClick={onOpenSidebar}
          className="doera-btn-icon"
          title="Open menu"
        >
          <Menu size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AnimatedLogo size="xs" state="idle" showAura={false} />
          <span className="doera-mobile-brand-title">DOERA AI</span>
        </div>
      </div>

      <button
        onClick={createNewConversation}
        className="doera-btn-icon"
        style={{ color: 'var(--peacock)', background: 'var(--peacock-light)' }}
        title="New Task"
      >
        <Plus size={16} strokeWidth={2.4} />
      </button>
    </header>
  );
};

export default Header;
