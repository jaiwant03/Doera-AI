import React, { useState } from 'react';
import { MapPin, Navigation, X, ShieldAlert, CheckCircle2, Radio } from 'lucide-react';

const LocationPermission = ({
  isOpen,
  onClose,
  onLocationAcquired,
  isTrackingActive,
  onToggleTracking,
}) => {
  const [manualQuery, setManualQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLoading(false);
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          name: 'Current Location',
        };
        if (onLocationAcquired) {
          onLocationAcquired(loc);
        }
        onClose();
      },
      (err) => {
        setIsLoading(false);
        if (err.code === 1) {
          setErrorMsg('Location access was denied. You can enter your city or area manually below.');
        } else {
          setErrorMsg(`Unable to retrieve location (${err.message}). Enter location manually.`);
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    if (onLocationAcquired) {
      onLocationAcquired({ name: manualQuery.trim() });
    }
    onClose();
  };

  return (
    <div className="doera-loc-permission-modal-overlay" onClick={onClose}>
      <div className="doera-loc-permission-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="doera-loc-modal-icon">
            <MapPin size={24} />
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#A08FA8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="doera-loc-modal-title">Enable Live Location Intelligence</h3>
        <p className="doera-loc-modal-desc">
          DOERA AI uses your location solely to calculate real road distances, find verified nearby professionals, and plan optimal routes. Your coordinates are never stored permanently without consent.
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="doera-loc-modal-actions">
          <button
            type="button"
            onClick={handleRequestBrowserLocation}
            className="doera-loc-primary-btn"
            disabled={isLoading}
          >
            <Navigation size={15} />
            {isLoading ? 'Locating...' : 'Allow Browser Location Access'}
          </button>

          {onToggleTracking && (
            <button
              type="button"
              onClick={onToggleTracking}
              className="doera-loc-secondary-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Radio size={14} color={isTrackingActive ? '#10B981' : '#A997B2'} />
              {isTrackingActive ? 'Disable Live GPS Watch' : 'Enable Optional Live GPS Watch'}
            </button>
          )}

          <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '11px', color: '#887491' }}>
            — OR ENTER CITY / AREA MANUALLY —
          </div>

          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Coimbatore, Gandhipuram"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              style={{
                flex: 1,
                background: '#190C23',
                border: '1px solid #3B1B48',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#FFF',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="doera-loc-secondary-btn"
              style={{ padding: '9px 14px', fontSize: '12px' }}
            >
              Set
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocationPermission;
