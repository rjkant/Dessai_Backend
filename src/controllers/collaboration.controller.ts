/**
 * Collaboration Controller
 * HTTP and WebSocket endpoints for real-time collaborative features
 */

import { Request, Response } from 'express';
import { WebSocket } from 'ws';
import {
  CollaborationService,
  CursorPosition,
  CodeChange,
} from '../services/collaboration.service';
import { database } from '../services/database.service';

export class CollaborationController {
  private collaborationService: CollaborationService;

  constructor() {
    this.collaborationService = new CollaborationService(database.getClient());
  }

  // ============================================================================
  // HTTP ENDPOINTS
  // ============================================================================

  /**
   * POST /api/collaboration/sessions/:sessionId/join
   * Join a collaboration session
   */
  joinSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { role, userName } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
        return;
      }

      const session = await this.collaborationService.createOrJoinSession(
        sessionId,
        userId,
        userName || `User ${userId}`,
        role || 'candidate'
      );

      res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          assessmentSessionId: session.assessmentSessionId,
          participants: Array.from(session.participants.values()),
          currentCode: session.currentCode,
          isActive: session.isActive,
        },
        message: 'Successfully joined collaboration session',
      });
    } catch (error: any) {
      console.error('Error joining collaboration session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to join collaboration session',
      });
    }
  };

  /**
   * POST /api/collaboration/sessions/:sessionId/leave
   * Leave a collaboration session
   */
  leaveSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      await this.collaborationService.leaveSession(sessionId, userId);

      res.status(200).json({
        success: true,
        message: 'Successfully left collaboration session',
      });
    } catch (error: any) {
      console.error('Error leaving collaboration session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to leave collaboration session',
      });
    }
  };

  /**
   * GET /api/collaboration/sessions/:sessionId/state
   * Get current collaboration session state
   */
  getSessionState = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const sessionState = await this.collaborationService.getSessionState(sessionId);

      if (!sessionState) {
        res.status(404).json({
          success: false,
          error: 'Collaboration session not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: sessionState,
      });
    } catch (error: any) {
      console.error('Error getting session state:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session state',
      });
    }
  };

  /**
   * POST /api/collaboration/sessions/:sessionId/code-change
   * Apply code change (fallback for when WebSocket is not available)
   */
  applyCodeChange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { operation, position, content, length } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!operation || !position || content === undefined) {
        res.status(400).json({
          success: false,
          error: 'Operation, position, and content are required',
        });
        return;
      }

      const codeChange: Omit<CodeChange, 'id' | 'timestamp'> = {
        sessionId,
        userId,
        operation: operation as 'insert' | 'delete' | 'replace',
        position,
        content,
        ...(length && { length }),
      };

      await this.collaborationService.applyCodeChange(sessionId, userId, codeChange);

      res.status(200).json({
        success: true,
        message: 'Code change applied successfully',
      });
    } catch (error: any) {
      console.error('Error applying code change:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to apply code change',
      });
    }
  };

  /**
   * POST /api/collaboration/sessions/:sessionId/cursor
   * Update cursor position (fallback for when WebSocket is not available)
   */
  updateCursor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { line, column, selection } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (line === undefined || column === undefined) {
        res.status(400).json({
          success: false,
          error: 'Line and column are required',
        });
        return;
      }

      const cursor: CursorPosition = {
        line,
        column,
        ...(selection && { selection }),
      };

      await this.collaborationService.updateCursorPosition(sessionId, userId, cursor);

      res.status(200).json({
        success: true,
        message: 'Cursor position updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating cursor position:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update cursor position',
      });
    }
  };

  /**
   * GET /api/collaboration/sessions/:sessionId/stats
   * Get collaboration statistics
   */
  getCollaborationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const stats = await this.collaborationService.getCollaborationStats(sessionId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'Collaboration session not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting collaboration stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get collaboration statistics',
      });
    }
  };

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  /**
   * Handle WebSocket connection for real-time collaboration
   */
  handleWebSocketConnection = (ws: WebSocket, userId: string): void => {
    this.collaborationService.handleWebSocketConnection(ws, userId);

    // Send connection acknowledgment
    ws.send(
      JSON.stringify({
        type: 'connection_ack',
        userId,
        timestamp: new Date(),
        message: 'Connected to collaboration service',
      })
    );
  };

  /**
   * Handle WebSocket upgrade for collaboration endpoints
   */
  handleWebSocketUpgrade = (request: any, socket: any, head: any, wss: any): void => {
    // Extract user ID from query parameters or JWT
    const url = new URL(request.url, `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      this.handleWebSocketConnection(ws, userId);
      wss.emit('connection', ws, request);
    });
  };

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clean up inactive sessions (scheduled task)
   */
  cleanupInactiveSessions = async (): Promise<void> => {
    try {
      await this.collaborationService.cleanupInactiveSessions();
      console.log('Collaboration session cleanup completed');
    } catch (error) {
      console.error('Error during collaboration session cleanup:', error);
    }
  };

  /**
   * Get active collaboration sessions (admin endpoint)
   */
  getActiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // This would be implemented as an admin-only endpoint
      // For now, return placeholder data
      res.status(200).json({
        success: true,
        data: {
          activeSessions: 0,
          totalParticipants: 0,
          averageSessionDuration: 0,
        },
        message: 'Active sessions data retrieved',
      });
    } catch (error: any) {
      console.error('Error getting active sessions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active sessions',
      });
    }
  };

  /**
   * Validate collaboration session access (future implementation)
   */
  // Commented out to avoid unused code warnings - implement when needed
  // private async validateSessionAccess(sessionId: string, userId: string): Promise<boolean> {
  //   try {
  //     const sessionState = await this.collaborationService.getSessionState(sessionId);
  //     return sessionState !== null;
  //   } catch (error) {
  //     console.error('Error validating session access:', error);
  //     return false;
  //   }
  // }

  /**
   * Rate limiting for collaboration operations (future implementation)
   */
  // Commented out to avoid unused code warnings - implement when needed
  // private rateLimitCheck(userId: string, operation: string): boolean {
  //   // Production implementation would use Redis or proper rate limiting
  //   return true;
  // }
}
