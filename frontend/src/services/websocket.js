class WebSocketClient {
  constructor() {
    this.ws = null;
    const explicitWs = import.meta.env.VITE_WS_URL;
    if (explicitWs) {
      this.url = explicitWs;
    } else {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const clean = rawApi.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      if (clean.startsWith('https://')) {
        this.url = clean.replace('https://', 'wss://');
      } else if (clean.startsWith('http://')) {
        this.url = clean.replace('http://', 'ws://');
      } else {
        this.url = 'ws://localhost:5000';
      }
    }
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
    this.isConnected = false;
  }

  connect() {
    const token = localStorage.getItem('doera_token');
    if (!token) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connection_change', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.emit(data.type, data.payload || data);
            // Also emit wildcard for global monitoring
            this.emit('*', data);
          }
        } catch (err) {
          console.error('[DOERA WS] Failed to parse incoming message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[DOERA WS] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[DOERA WS] Connection initialization failed:', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[DOERA WS] Maximum reconnection attempts reached.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[DOERA WS] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
