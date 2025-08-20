/**
 * WebSocket Server Setup for Collaboration
 * Real-time communication server for collaborative features
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { JWTUtil } from '../utils/jwt.util';
import { CollaborationController } from '../controllers/collaboration.controller';

export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private collaborationController: CollaborationController;
  private connections: Map<string, WebSocket> = new Map();

  constructor(server: HTTPServer) {
    this.collaborationController = new CollaborationController();
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: '/ws/collaboration',
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupEventHandlers();
  }

  /**
   * Verify WebSocket client connection
   */
  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verify JWT token
      const payload = JWTUtil.verifyAccessToken(token);
      if (!payload || !payload.userId) {
        console.log('WebSocket connection rejected: Invalid token');
        return false;
      }

      // Store user info for later use
      info.req.userId = payload.userId;
      return true;
    } catch (error) {
      console.log('WebSocket connection rejected:', error);
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const userId = req.userId;
      
      if (!userId) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Store connection
      this.connections.set(userId, ws);
      console.log(`WebSocket connected: User ${userId}`);

      // Setup message handler
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, userId, data);
      });

      // Handle connection close
      ws.on('close', (code: number, reason: Buffer) => {
        this.handleDisconnection(userId, code, reason.toString());
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.connections.delete(userId);
      });

      // Handle collaboration controller WebSocket setup
      this.collaborationController.handleWebSocketConnection(ws, userId);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });

    console.log('Collaboration WebSocket server initialized on /ws/collaboration');
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: WebSocket, userId: string, data: Buffer): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      
      // Validate message format
      if (!message.type || !message.sessionId) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format: type and sessionId required',
          timestamp: new Date()
        }));
        return;
      }

      // Route message based on type
      switch (message.type) {
        case 'join_session':
          await this.handleJoinSession(ws, userId, message);
          break;
        
        case 'leave_session':
          await this.handleLeaveSession(ws, userId, message);
          break;
        
        case 'code_change':
          await this.handleCodeChange(ws, userId, message);
          break;
        
        case 'cursor_update':
          await this.handleCursorUpdate(ws, userId, message);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date()
          }));
          break;
        
        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${message.type}`,
            timestamp: new Date()
          }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message',
        timestamp: new Date()
      }));
    }
  }

  /**
   * Handle session join via WebSocket
   */
  private async handleJoinSession(ws: WebSocket, userId: string, message: any): Promise<void> {
    try {
      const { sessionId, role, userName } = message;
      
      // This would integrate with the collaboration service
      // For now, send acknowledgment
      ws.send(JSON.stringify({
        type: 'session_joined',
        sessionId,
        userId,
        role: role || 'participant',
        userName: userName || `User ${userId}`,
        timestamp: new Date()
      }));

      // Broadcast to other participants
      this.broadcastToSession(sessionId, {
        type: 'participant_joined',
        sessionId,
        participant: {
          userId,
          role: role || 'participant',
          userName: userName || `User ${userId}`,
          joinedAt: new Date()
        }
      }, userId);

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to join session',
        timestamp: new Date()
      }));
    }
  }

  /**
   * Handle session leave via WebSocket
   */
  private async handleLeaveSession(ws: WebSocket, userId: string, message: any): Promise<void> {
    try {
      const { sessionId } = message;
      
      ws.send(JSON.stringify({
        type: 'session_left',
        sessionId,
        userId,
        timestamp: new Date()
      }));

      // Broadcast to other participants
      this.broadcastToSession(sessionId, {
        type: 'participant_left',
        sessionId,
        userId,
        timestamp: new Date()
      }, userId);

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to leave session',
        timestamp: new Date()
      }));
    }
  }

  /**
   * Handle code change via WebSocket
   */
  private async handleCodeChange(ws: WebSocket, userId: string, message: any): Promise<void> {
    try {
      const { sessionId, operation, position, content, length } = message;
      
      // Validate code change data
      if (!operation || position === undefined || content === undefined) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid code change: operation, position, and content required',
          timestamp: new Date()
        }));
        return;
      }

      // Broadcast code change to all session participants
      this.broadcastToSession(sessionId, {
        type: 'code_changed',
        sessionId,
        change: {
          id: `${Date.now()}-${Math.random()}`,
          userId,
          operation,
          position,
          content,
          length,
          timestamp: new Date()
        }
      });

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process code change',
        timestamp: new Date()
      }));
    }
  }

  /**
   * Handle cursor update via WebSocket
   */
  private async handleCursorUpdate(ws: WebSocket, userId: string, message: any): Promise<void> {
    try {
      const { sessionId, line, column, selection } = message;
      
      // Validate cursor data
      if (line === undefined || column === undefined) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid cursor update: line and column required',
          timestamp: new Date()
        }));
        return;
      }

      // Broadcast cursor update to all session participants except sender
      this.broadcastToSession(sessionId, {
        type: 'cursor_updated',
        sessionId,
        cursor: {
          userId,
          line,
          column,
          selection,
          timestamp: new Date()
        }
      }, userId);

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process cursor update',
        timestamp: new Date()
      }));
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(userId: string, code: number, reason: string): void {
    console.log(`WebSocket disconnected: User ${userId}, Code: ${code}, Reason: ${reason}`);
    this.connections.delete(userId);
    
    // TODO: Notify collaboration service about disconnection
    // This would clean up any active sessions for this user
  }

  /**
   * Broadcast message to all participants in a session
   */
  private broadcastToSession(_sessionId: string, message: any, excludeUserId?: string): void {
    // In a real implementation, this would:
    // 1. Get all participants for the session from the collaboration service
    // 2. Send the message to all connected participants except the excluded user
    
    // For now, this is a placeholder implementation
    const messageStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date()
    });

    // Broadcast to all connections (would be filtered by session in production)
    this.connections.forEach((ws, connectedUserId) => {
      if (connectedUserId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, message: any): boolean {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date()
      }));
      return true;
    }
    return false;
  }

  /**
   * Get active connection count
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connected user IDs
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close specific connection
   */
  public closeConnection(userId: string, code?: number, reason?: string): boolean {
    const ws = this.connections.get(userId);
    if (ws) {
      ws.close(code || 1000, reason || 'Connection closed by server');
      this.connections.delete(userId);
      return true;
    }
    return false;
  }

  /**
   * Close all connections and shutdown server
   */
  public shutdown(): void {
    console.log('Shutting down collaboration WebSocket server...');
    
    // Close all connections
    this.connections.forEach((ws) => {
      ws.close(1001, 'Server shutdown');
    });
    
    this.connections.clear();
    this.wss.close();
    console.log('Collaboration WebSocket server shutdown complete');
  }
}
