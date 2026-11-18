import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Mic, 
  MicOff, 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Square,
  MapPin
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import LocationPermission from '../Map/LocationPermission';

const ChatInput = ({ onSendMessage, isSending, initialValue = '' }) => {
  const { 
    isStreaming, 
    stopGeneration,
    userLocation,
    setUserLocation,
    isLocationModalOpen,
    setIsLocationModalOpen,
    isTrackingActive,
    toggleLiveTracking,
  } = useChat();
  const [input, setInput] = useState(initialValue);
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-US'); // 'en-US' or 'ta-IN'
  const [speechSupported, setSpeechSupported] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseInputRef = useRef('');

  // Sync initialValue
  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + text.trim();
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + text.trim();
          }
        }

        const spoken = [finalTranscript, interimTranscript].filter(Boolean).join(' ').trim();
        const base = baseInputRef.current;
        const fullText = base ? (base + ' ' + spoken).trim() : spoken;
        setInput(fullText);
      };

      recognition.onerror = (err) => {
        console.warn('[DOERA Speech] Recognition error:', err?.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [speechLang]);

  // Auto-grow textarea height smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 24), 160)}px`;
    }
  }, [input]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      baseInputRef.current = '';
    } else {
      try {
        if (recognitionRef.current) {
          // Snapshot current input as base so existing text is preserved and speech appends cleanly
          baseInputRef.current = input.trim();
          recognitionRef.current.lang = speechLang;
          recognitionRef.current.start();
          setIsRecording(true);
        }
      } catch (err) {
        console.error('[DOERA Speech] Recognition start error:', err);
      }
    }
  };

  const toggleLanguage = () => {
    const nextLang = speechLang === 'en-US' ? 'ta-IN' : 'en-US';
    setSpeechLang(nextLang);
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      baseInputRef.current = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const fileObjects = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      raw: file,
    }));

    setAttachments((prev) => [...prev, ...fileObjects]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isSending) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    baseInputRef.current = '';

    onSendMessage(trimmed, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const canSubmit = (input.trim().length > 0 || attachments.length > 0) && !isSending;

  return (
    <div className="doera-composer-wrapper">
      <div className={`doera-composer-container ${isFocused ? 'focused' : ''}`}>
        {/* Attachment Chips Bar & Active Location Pill */}
        {(attachments.length > 0 || userLocation) && (
          <div className="doera-composer-chips">
            {userLocation && (
              <div className="doera-attachment-chip" style={{ background: 'rgba(241, 45, 152, 0.15)', borderColor: 'rgba(241, 45, 152, 0.4)' }}>
                <MapPin size={12} color="#FF55BD" />
                <span className="doera-chip-name" style={{ color: '#FF7BD5', fontWeight: 600 }}>
                  {userLocation.name || 'Current Location'}
                  {isTrackingActive ? ' (Live GPS)' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setUserLocation(null)}
                  className="doera-chip-remove"
                  title="Clear location"
                >
                  <X size={11} />
                </button>
              </div>
            )}
            {attachments.map((file, idx) => (
              <div key={idx} className="doera-attachment-chip">
                {file.type?.startsWith('image/') ? (
                  <ImageIcon size={12} className="doera-chip-icon" />
                ) : (
                  <FileText size={12} className="doera-chip-icon" />
                )}
                <span className="doera-chip-name">{file.name}</span>
                <span className="doera-chip-size">
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="doera-chip-remove"
                  title="Remove file"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="doera-composer-form">
          {/* Left: Attachment & Location Triggers */}
          <div className="doera-composer-left" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="doera-btn-icon doera-composer-icon-btn"
              title="Attach documents, invoices or images"
            >
              <Paperclip size={17} />
            </button>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className={`doera-btn-icon doera-composer-icon-btn ${userLocation ? 'active' : ''}`}
              title={userLocation ? `Location active: ${userLocation.name}` : 'Use my location for nearby search & routing'}
              style={userLocation ? { color: '#FF55BD' } : {}}
            >
              <MapPin size={17} />
            </button>
          </div>

          {/* Center: Multiline Text Area */}
          <div className="doera-composer-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Tell DOERA what you need..."
              rows={1}
              className="doera-composer-textarea"
            />
          </div>

          {/* Right Toolbar: Language, Mic, Send */}
          <div className="doera-composer-right">
            {/* Language Selector Pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="doera-lang-pill"
              title={`Switch voice language (Current: ${speechLang === 'en-US' ? 'English' : 'Tamil'})`}
            >
              <span>{speechLang === 'en-US' ? 'EN' : 'TA'}</span>
            </button>

            {/* Voice Input Microphone */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`doera-btn-icon doera-composer-mic-btn ${isRecording ? 'recording' : ''}`}
                title={isRecording ? 'Stop listening' : 'Speak your request'}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            {/* Signature Gradient Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="doera-send-btn active streaming-stop"
                title="Stop generating"
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className={`doera-send-btn ${canSubmit ? 'active' : 'disabled'} ${isSending ? 'sending' : ''}`}
                title="Execute task (Enter)"
              >
                {isSending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2.6} />
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Subtle Bottom Keyboard Shortcut & Trust Hint */}
      <div className="doera-composer-footnote">
        <span>DOERA AI coordinates real services with verified outcomes</span>
        <span className="doera-footnote-sep">•</span>
        <span>Enter ↵ to execute</span>
      </div>

      {/* Location Permission & Manual Setting Modal */}
      <LocationPermission
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationAcquired={(loc) => setUserLocation(loc)}
        isTrackingActive={isTrackingActive}
        onToggleTracking={toggleLiveTracking}
      />
    </div>
  );
};

export default ChatInput;
