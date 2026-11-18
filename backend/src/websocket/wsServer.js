import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class RealtimeServer {
  constructor() {
    this.wss = null;
    this.userSockets = new Map(); // userId -> Set<WebSocket>
    this.taskSubscriptions = new Map(); // taskId -> Set<WebSocket>
  }

  init(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('[DOERA WS] WebSocket server initialized.');
  }

  handleConnection(ws, req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication token missing');
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, config.jwtSecret);
      } catch (err) {
        ws.close(4002, 'Invalid authentication token');
        return;
      }

      const userId = decoded.userId;
      ws.userId = userId;
      ws.isAlive = true;

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(ws);

      logger.info(`[DOERA WS] Client connected for user: ${userId}`);

      // Send initial connection ack
      this.sendToSocket(ws, 'connected', { status: 'connected', userId });

      // Handle ping/pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages from client (e.g., task subscription)
      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'subscribe_task' && parsed.taskId) {
            if (!this.taskSubscriptions.has(parsed.taskId)) {
              this.taskSubscriptions.set(parsed.taskId, new Set());
            }
            this.taskSubscriptions.get(parsed.taskId).add(ws);
          }
        } catch (err) {
          logger.warn('[DOERA WS] Failed to parse message from client:', err.message);
        }
      });

      // Handle close
      ws.on('close', () => {
        this.removeSocket(userId, ws);
      });

      ws.on('error', (err) => {
        logger.error(`[DOERA WS] Error on socket for user ${userId}:`, err.message);
        this.removeSocket(userId, ws);
      });
    } catch (err) {
      logger.error('[DOERA WS] Connection handling error:', err.message);
      ws.close(4000, 'Internal server error');
    }
  }

  removeSocket(userId, ws) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(ws);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    // Remove from task subscriptions
    for (const [taskId, set] of this.taskSubscriptions.entries()) {
      set.delete(ws);
      if (set.size === 0) {
        this.taskSubscriptions.delete(taskId);
      }
    }
  }

  sendToSocket(ws, type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  sendToUser(userId, type, payload) {
    const sockets = this.userSockets.get(String(userId));
    if (sockets) {
      sockets.forEach((ws) => {
        this.sendToSocket(ws, type, payload);
      });
    }
  }

  sendToTask(taskId, type, payload) {
    const sockets = this.taskSubscriptions.get(String(taskId));
    if (sockets) {
      sockets.forEach((ws) => {
        this.sendToSocket(ws, type, payload);
      });
    }
  }

  broadcast(type, payload) {
    if (!this.wss) return;
    this.wss.clients.forEach((client) => {
      this.sendToSocket(client, type, payload);
    });
  }
}

export const realtimeServer = new RealtimeServer();
export default realtimeServer;
