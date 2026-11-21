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
  MapPin,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import LocationPermission from '../Map/LocationPermission';

const ChatInput = ({ onSendMessage, isSending, initialValue = '' }) => {
  const { 
    isStreaming, 
    stopGeneration,
    userLocation,
    setUserLocation,
    detectLocation,
    setManualLocation,
    clearLocation,
    isDetectingLocation,
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

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const isText =
          file.type.startsWith('text/') ||
          file.type === 'application/json' ||
          file.type === 'text/csv' ||
          file.type === 'text/plain' ||
          /\.(csv|json|txt|md|js|jsx|ts|tsx|py|html|css|xml|yaml|yml|log|sql)$/i.test(file.name);

        const isImage =
          file.type.startsWith('image/') ||
          /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

        const reader = new FileReader();

        if (isText) {
          reader.onload = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || 'text/plain',
              content: reader.result,
              text: reader.result,
            });
          };
          reader.onerror = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || 'text/plain',
              content: '',
            });
          };
          reader.readAsText(file);
        } else {
          reader.onload = () => {
            const dataUrl = reader.result;
            const base64 = typeof dataUrl === 'string' && dataUrl.includes(',')
              ? dataUrl.split(',')[1]
              : '';
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
              dataUrl,
              base64,
            });
          };
          reader.onerror = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              base64: '',
            });
          };
          reader.readAsDataURL(file);
        }
      });
    });

    try {
      const readFiles = await Promise.all(readPromises);
      setAttachments((prev) => [...prev, ...readFiles]);
    } catch (err) {
      console.error('[DOERA File Upload] File reading error:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isSending) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    baseInputRef.current = '';

    const isNearMe =
      /\b(near me|nearby|closest|nearest|around me|within \d+\s*(?:km|miles?)|near here)\b/i.test(trimmed) &&
      !/\bnear\s+(?!me\b|here\b)[a-z0-9]/i.test(trimmed);

    let locationToPass = null;

    if (isNearMe) {
      // 1. If location is already resolved or manually set with valid coordinates
      if (userLocation && (userLocation.status === 'resolved' || userLocation.status === 'manual') && userLocation.lat && userLocation.lng) {
        locationToPass = userLocation;
      } else if (userLocation && (userLocation.status === 'denied' || userLocation.denied)) {
        // User explicitly denied location previously
        locationToPass = { denied: true, source: 'denied' };
      } else if (userLocation && (userLocation.status === 'error' || userLocation.unavailable)) {
        // Location detection failed/unavailable previously
        locationToPass = { unavailable: true, source: 'unavailable' };
      } else {
        // Location not yet determined; automatically trigger detectLocation()
        const detected = await detectLocation();
        if (detected?.status === 'resolved' && detected?.lat) {
          locationToPass = detected;
        } else if (detected?.status === 'denied' || detected?.denied) {
          locationToPass = { denied: true, source: 'denied' };
        } else {
          locationToPass = { unavailable: true, source: 'unavailable' };
        }
      }
    } else if (userLocation) {
      // For general queries, pass current location if active and valid
      if ((userLocation.status === 'resolved' || userLocation.status === 'manual') && userLocation.lat) {
        locationToPass = userLocation;
      }
    }

    onSendMessage(trimmed, attachments, locationToPass);
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
        {(attachments.length > 0 || userLocation || isDetectingLocation) && (
          <div className="doera-composer-chips">
            {/* Dynamic Location Chip with 5 distinct states */}
            {isDetectingLocation || userLocation?.status === 'detecting' ? (
              // State A: While detecting
              <div
                className="doera-attachment-chip"
                style={{
                  background: 'rgba(241, 45, 152, 0.12)',
                  borderColor: 'rgba(241, 45, 152, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Loader2 size={12} className="animate-spin" color="#FF55BD" />
                <span className="doera-chip-name" style={{ color: '#FF7BD5', fontWeight: 600 }}>
                  Detecting location...
                </span>
              </div>
            ) : userLocation?.status === 'resolved' || (userLocation?.lat && userLocation?.status !== 'manual' && !userLocation?.denied) ? (
              // State B: After successful detection (Resolved locality)
              <div
                className="doera-attachment-chip"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={12} color="#10B981" />
                <span className="doera-chip-name" style={{ color: '#34D399', fontWeight: 600 }}>
                  {userLocation.name}
                  {isTrackingActive ? ' (Live GPS)' : ''}
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="doera-chip-remove"
                  title="Clear location"
                  style={{ color: '#34D399', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : userLocation?.status === 'denied' || userLocation?.denied ? (
              // State C: If permission denied
              <div
                className="doera-attachment-chip"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={12} color="#EF4444" />
                <span className="doera-chip-name" style={{ color: '#FCA5A5', fontWeight: 600 }}>
                  Location access denied
                </span>
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  style={{
                    background: 'rgba(239, 68, 68, 0.25)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '4px',
                    color: '#FEE2E2',
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#F3F4F6',
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Enter manually
                </button>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="doera-chip-remove"
                  title="Dismiss"
                  style={{ color: '#FCA5A5', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : userLocation?.status === 'error' || userLocation?.unavailable ? (
              // State D: If detection fails / error
              <div
                className="doera-attachment-chip"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={12} color="#F59E0B" />
                <span className="doera-chip-name" style={{ color: '#FCD34D', fontWeight: 600 }}>
                  Unable to detect location
                </span>
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  style={{
                    background: 'rgba(245, 158, 11, 0.25)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: '4px',
                    color: '#FEF3C7',
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#F3F4F6',
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Enter manually
                </button>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="doera-chip-remove"
                  title="Dismiss"
                  style={{ color: '#FCD34D', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : userLocation?.status === 'manual' ? (
              // State E: If manually entered
              <div
                className="doera-attachment-chip"
                style={{
                  background: 'rgba(241, 45, 152, 0.15)',
                  borderColor: 'rgba(241, 45, 152, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={12} color="#FF55BD" />
                <span className="doera-chip-name" style={{ color: '#FF7BD5', fontWeight: 600 }}>
                  Using: {userLocation.name}
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="doera-chip-remove"
                  title="Clear location"
                  style={{ color: '#FF7BD5', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}

            {attachments.map((file, idx) => (
              <div key={idx} className="doera-attachment-chip">
                {file.type?.startsWith('image/') && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }}
                  />
                ) : file.type?.startsWith('image/') ? (
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
              onClick={() => {
                if (!userLocation || userLocation.status === 'denied' || userLocation.status === 'error') {
                  detectLocation();
                } else {
                  setIsLocationModalOpen(true);
                }
              }}
              className={`doera-btn-icon doera-composer-icon-btn ${
                userLocation?.status === 'resolved' || userLocation?.status === 'manual' ? 'active' : ''
              }`}
              title={
                userLocation?.status === 'resolved'
                  ? `Active location: ${userLocation.name} (Click to change)`
                  : userLocation?.status === 'manual'
                  ? `Manual location: ${userLocation.name} (Click to change)`
                  : 'Detect my location for nearby search & routing'
              }
              style={
                userLocation?.status === 'resolved'
                  ? { color: '#10B981' }
                  : userLocation?.status === 'manual'
                  ? { color: '#FF55BD' }
                  : {}
              }
            >
              {isDetectingLocation ? (
                <Loader2 size={17} className="animate-spin" color="#FF55BD" />
              ) : (
                <MapPin size={17} />
              )}
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
