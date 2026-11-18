import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Check, Zap } from 'lucide-react';
import api from '../../services/api';
import './ModelSelector.css';

const DEFAULT_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'LLaMA 3.3 70B',
    provider: 'Groq',
    description: 'Flagship reasoning & autonomous orchestration',
    speed: 'Ultra-Fast',
    badge: 'DEFAULT',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'LLaMA 3.1 8B',
    provider: 'Groq',
    description: 'Instant response for rapid queries',
    speed: 'Blazing',
    badge: 'FAST',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Efficient coding & lightweight execution',
    speed: 'Fast',
    badge: 'CODING',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Advanced multimodal intelligence',
    speed: 'High-Power',
    badge: 'PRO',
  },
];

const ModelSelector = ({ selectedModel, onSelectModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const menuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchModels = async () => {
      try {
        const res = await api.get('/chat/models');
        if (isMounted && res.data?.models && res.data.models.length > 0) {
          setModels(res.data.models);
        }
      } catch (_) {}
    };
    fetchModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModel = models.find((m) => m.id === selectedModel) || models[0] || DEFAULT_MODELS[0];

  return (
    <div className="doera-model-selector-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`doera-model-pill-btn ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Choose intelligence model"
      >
        <Sparkles size={13} className="doera-model-icon" />
        <span className="doera-model-name">{activeModel.name}</span>
        <span className="doera-model-provider">{activeModel.provider}</span>
        <ChevronDown size={12} className={`doera-model-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="doera-model-dropdown-menu animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="doera-model-dropdown-header">
            <span>ACTIVE REASONING MODEL</span>
          </div>

          <div className="doera-model-options-list">
            {models.map((m) => {
              const isSelected = m.id === activeModel.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`doera-model-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onSelectModel) {
                      onSelectModel(m.id);
                    }
                    setIsOpen(false);
                  }}
                >
                  <div className="doera-model-option-top">
                    <span className="doera-model-option-title">{m.name}</span>
                    <span className="doera-model-option-badge">
                      {m.badge || m.provider}
                    </span>
                  </div>

                  <p className="doera-model-option-desc">{m.description}</p>

                  <div className="doera-model-option-meta">
                    <span className="doera-model-speed">
                      <Zap size={11} /> {m.speed || 'Fast'}
                    </span>
                    {isSelected && <Check size={14} className="doera-model-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
