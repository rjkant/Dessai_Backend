/**
 * Collaboration Service
 * Real-time collaborative features for assessment sessions
 * Supports multi-user code editing, cursor tracking, and participant management
 */

import { PrismaClient } from '@prisma/client';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Types for collaboration
export interface ParticipantInfo {
  userId: string;
  userName: string;
  role: 'candidate' | 'interviewer' | 'observer';
  joinedAt: Date;
  isActive: boolean;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CodeChange {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  operation: 'insert' | 'delete' | 'replace';
  position: {
    line: number;
    column: number;
  };
  content: string;
  length?: number; // for delete operations
}

export interface CollaborationMessage {
  type:
    | 'code_change'
    | 'cursor_move'
    | 'participant_join'
    | 'participant_leave'
    | 'sync_request'
    | 'sync_response';
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: any;
}

export interface CollaborationSession {
  id: string;
  assessmentSessionId: string;
  participants: Map<string, ParticipantInfo>;
  currentCode: string;
  codeHistory: CodeChange[];
  lastSyncAt: Date;
  isActive: boolean;
}

export class CollaborationService {
  private prisma: PrismaClient;
  private sessions: Map<string, CollaborationSession> = new Map();
  private userConnections: Map<string, WebSocket> = new Map();
  private sessionConnections: Map<string, Set<string>> = new Map(); // sessionId -> Set of userIds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create or join a collaboration session
   */
  async createOrJoinSession(
    assessmentSessionId: string,
    userId: string,
    userName: string,
    role: 'candidate' | 'interviewer' | 'observer' = 'candidate'
  ): Promise<CollaborationSession> {
    // Check if session already exists
    let session = this.sessions.get(assessmentSessionId);

    if (!session) {
      // Get initial code from database if available
      const sessionData = await this.prisma.collaborationSession.findFirst({
        where: { participationId: assessmentSessionId },
        include: {
          participation: {
            include: {
              submissions: {
                orderBy: { submittedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      const initialCode = sessionData?.participation?.submissions?.[0]?.content || '';

      // Create new collaboration session
      session = {
        id: uuidv4(),
        assessmentSessionId,
        participants: new Map(),
        currentCode: typeof initialCode === 'string' ? initialCode : JSON.stringify(initialCode),
        codeHistory: [],
        lastSyncAt: new Date(),
        isActive: true,
      };

      this.sessions.set(assessmentSessionId, session);
      this.sessionConnections.set(assessmentSessionId, new Set());
    }

    // Add participant to session
    const participant: ParticipantInfo = {
      userId,
      userName,
      role,
      joinedAt: new Date(),
      isActive: true,
    };

    session.participants.set(userId, participant);
    this.sessionConnections.get(assessmentSessionId)?.add(userId);

    // Broadcast participant join
    this.broadcastToSession(assessmentSessionId, {
      type: 'participant_join',
      sessionId: assessmentSessionId,
      userId,
      timestamp: new Date(),
      data: { participant },
    });

    return session;
  }

  /**
   * Leave collaboration session
   */
  async leaveSession(assessmentSessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(assessmentSessionId);
    if (!session) {
      return;
    }

    // Mark participant as inactive
    const participant = session.participants.get(userId);
    if (participant) {
      participant.isActive = false;
      session.participants.delete(userId);
    }

    // Remove from session connections
    this.sessionConnections.get(assessmentSessionId)?.delete(userId);
    this.userConnections.delete(userId);

    // Broadcast participant leave
    this.broadcastToSession(assessmentSessionId, {
      type: 'participant_leave',
      sessionId: assessmentSessionId,
      userId,
      timestamp: new Date(),
      data: { userId },
    });

    // Clean up empty sessions
    if (session.participants.size === 0) {
      session.isActive = false;
      // Don't delete immediately - keep for history
    }
  }

  // ============================================================================
  // REAL-TIME CODE SYNCHRONIZATION
  // ============================================================================

  /**
   * Apply code change and broadcast to other participants
   */
  async applyCodeChange(
    assessmentSessionId: string,
    userId: string,
    change: Omit<CodeChange, 'id' | 'timestamp'>
  ): Promise<void> {
    const session = this.sessions.get(assessmentSessionId);
    if (!session || !session.isActive) {
      throw new Error('Collaboration session not found or inactive');
    }

    // Create change record
    const codeChange: CodeChange = {
      id: uuidv4(),
      timestamp: new Date(),
      ...change,
    };

    // Apply change to current code
    session.currentCode = this.applyChangeToCode(session.currentCode, codeChange);
    session.codeHistory.push(codeChange);
    session.lastSyncAt = new Date();

    // Persist to database periodically
    if (session.codeHistory.length % 10 === 0) {
      await this.persistSession(session);
    }

    // Broadcast change to other participants
    this.broadcastToSession(
      assessmentSessionId,
      {
        type: 'code_change',
        sessionId: assessmentSessionId,
        userId,
        timestamp: new Date(),
        data: { change: codeChange, currentCode: session.currentCode },
      },
      userId
    ); // Exclude the sender
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(
    assessmentSessionId: string,
    userId: string,
    cursor: CursorPosition
  ): Promise<void> {
    const session = this.sessions.get(assessmentSessionId);
    if (!session || !session.isActive) {
      return;
    }

    const participant = session.participants.get(userId);
    if (participant) {
      participant.cursor = cursor;

      // Broadcast cursor update
      this.broadcastToSession(
        assessmentSessionId,
        {
          type: 'cursor_move',
          sessionId: assessmentSessionId,
          userId,
          timestamp: new Date(),
          data: { cursor },
        },
        userId
      );
    }
  }

  /**
   * Get current session state for synchronization
   */
  async getSessionState(assessmentSessionId: string): Promise<{
    currentCode: string;
    participants: ParticipantInfo[];
    lastSyncAt: Date;
  } | null> {
    const session = this.sessions.get(assessmentSessionId);
    if (!session) {
      return null;
    }

    return {
      currentCode: session.currentCode,
      participants: Array.from(session.participants.values()),
      lastSyncAt: session.lastSyncAt,
    };
  }

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(ws: WebSocket, userId: string): void {
    this.userConnections.set(userId, ws);

    ws.on('message', async (data: string) => {
      try {
        const message: CollaborationMessage = JSON.parse(data);
        await this.handleCollaborationMessage(message, userId);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        );
      }
    });

    ws.on('close', () => {
      this.userConnections.delete(userId);
      // Find sessions this user was part of and mark them as left
      for (const [sessionId, connections] of this.sessionConnections.entries()) {
        if (connections.has(userId)) {
          this.leaveSession(sessionId, userId);
          break;
        }
      }
    });

    ws.on('error', error => {
      console.error('WebSocket error for user', userId, ':', error);
      this.userConnections.delete(userId);
    });
  }

  /**
   * Handle collaboration messages
   */
  private async handleCollaborationMessage(
    message: CollaborationMessage,
    userId: string
  ): Promise<void> {
    switch (message.type) {
      case 'code_change':
        await this.applyCodeChange(message.sessionId, userId, message.data.change);
        break;

      case 'cursor_move':
        await this.updateCursorPosition(message.sessionId, userId, message.data.cursor);
        break;

      case 'sync_request':
        const sessionState = await this.getSessionState(message.sessionId);
        const userWs = this.userConnections.get(userId);
        if (userWs && sessionState) {
          userWs.send(
            JSON.stringify({
              type: 'sync_response',
              sessionId: message.sessionId,
              timestamp: new Date(),
              data: sessionState,
            })
          );
        }
        break;

      default:
        console.warn('Unknown collaboration message type:', message.type);
    }
  }

  /**
   * Broadcast message to all participants in a session
   */
  private broadcastToSession(
    sessionId: string,
    message: CollaborationMessage,
    excludeUserId?: string
  ): void {
    const connections = this.sessionConnections.get(sessionId);
    if (!connections) {
      return;
    }

    const messageStr = JSON.stringify(message);

    for (const userId of connections) {
      if (excludeUserId && userId === excludeUserId) {
        continue;
      }

      const userWs = this.userConnections.get(userId);
      if (userWs && userWs.readyState === WebSocket.OPEN) {
        userWs.send(messageStr);
      }
    }
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Apply a code change to existing code
   */
  private applyChangeToCode(currentCode: string, change: CodeChange): string {
    const lines = currentCode.split('\n');

    switch (change.operation) {
      case 'insert':
        if (change.position.line >= lines.length) {
          // Insert at end
          lines.push(change.content);
        } else {
          const line = lines[change.position.line];
          const before = line.substring(0, change.position.column);
          const after = line.substring(change.position.column);
          lines[change.position.line] = before + change.content + after;
        }
        break;

      case 'delete':
        if (change.position.line < lines.length && change.length) {
          const line = lines[change.position.line];
          const before = line.substring(0, change.position.column);
          const after = line.substring(change.position.column + change.length);
          lines[change.position.line] = before + after;
        }
        break;

      case 'replace':
        if (change.position.line < lines.length) {
          const line = lines[change.position.line];
          const before = line.substring(0, change.position.column);
          const after = line.substring(change.position.column + (change.length || 0));
          lines[change.position.line] = before + change.content + after;
        }
        break;
    }

    return lines.join('\n');
  }

  /**
   * Resolve conflicts between concurrent edits
   */
  private resolveConflicts(changes: CodeChange[]): CodeChange[] {
    // Sort changes by timestamp
    const sortedChanges = changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply operational transformation for conflict resolution
    const resolvedChanges: CodeChange[] = [];

    for (let i = 0; i < sortedChanges.length; i++) {
      const currentChange = sortedChanges[i];
      let transformedChange = { ...currentChange };

      // Transform against all previous changes
      for (let j = 0; j < i; j++) {
        const previousChange = resolvedChanges[j];
        transformedChange = this.transformChange(transformedChange, previousChange);
      }

      resolvedChanges.push(transformedChange);
    }

    return resolvedChanges;
  }

  /**
   * Operational transformation for two changes
   */
  private transformChange(change: CodeChange, againstChange: CodeChange): CodeChange {
    // Simplified operational transformation
    // In a production system, this would be much more sophisticated

    if (change.position.line === againstChange.position.line) {
      // Same line - adjust column positions
      if (
        againstChange.operation === 'insert' &&
        againstChange.position.column <= change.position.column
      ) {
        return {
          ...change,
          position: {
            ...change.position,
            column: change.position.column + againstChange.content.length,
          },
        };
      }

      if (
        againstChange.operation === 'delete' &&
        againstChange.position.column < change.position.column
      ) {
        return {
          ...change,
          position: {
            ...change.position,
            column: Math.max(
              againstChange.position.column,
              change.position.column - (againstChange.length || 0)
            ),
          },
        };
      }
    }

    return change;
  }

  // ============================================================================
  // PERSISTENCE AND CLEANUP
  // ============================================================================

  /**
   * Persist session state to database
   */
  private async persistSession(session: CollaborationSession): Promise<void> {
    try {
      // First try to find existing collaboration session
      const existing = await this.prisma.collaborationSession.findFirst({
        where: { participationId: session.assessmentSessionId },
      });

      if (existing) {
        // Update existing session
        await this.prisma.collaborationSession.update({
          where: { id: existing.id },
          data: {
            isActive: session.isActive,
            settings: JSON.parse(
              JSON.stringify({
                participants: Array.from(session.participants.values()),
                changeCount: session.codeHistory.length,
                currentCode: session.currentCode,
                lastSyncAt: session.lastSyncAt.toISOString(),
              })
            ),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new session
        await this.prisma.collaborationSession.create({
          data: {
            sessionToken: session.id,
            participationId: session.assessmentSessionId,
            isActive: session.isActive,
            settings: JSON.parse(
              JSON.stringify({
                participants: Array.from(session.participants.values()),
                changeCount: session.codeHistory.length,
                currentCode: session.currentCode,
                lastSyncAt: session.lastSyncAt.toISOString(),
              })
            ),
          },
        });
      }

      // Store code changes as collaboration events
      if (session.codeHistory.length > 0) {
        const recentChanges = session.codeHistory.slice(-10); // Store last 10 changes
        const collaborationSession =
          existing ||
          (await this.prisma.collaborationSession.findFirst({
            where: { participationId: session.assessmentSessionId },
          }));

        if (collaborationSession) {
          await this.prisma.collaborationEvent.createMany({
            data: recentChanges.map(change => ({
              sessionId: collaborationSession.id,
              type: 'code_change',
              data: JSON.parse(JSON.stringify(change)),
              timestamp: change.timestamp,
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch (error) {
      console.error('Error persisting collaboration session:', error);
    }
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastSync = now.getTime() - session.lastSyncAt.getTime();

      if (timeSinceLastSync > inactiveThreshold || session.participants.size === 0) {
        // Persist final state
        await this.persistSession(session);

        // Mark as inactive
        session.isActive = false;

        // Remove from memory after final persist
        this.sessions.delete(sessionId);
        this.sessionConnections.delete(sessionId);
      }
    }
  }

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(assessmentSessionId: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    codeChanges: number;
    sessionDuration: number;
    collaborationScore: number;
  } | null> {
    const session = this.sessions.get(assessmentSessionId);
    if (!session) {
      return null;
    }

    const activeParticipants = Array.from(session.participants.values()).filter(
      p => p.isActive
    ).length;

    const sessionStart = Math.min(
      ...Array.from(session.participants.values()).map(p => p.joinedAt.getTime())
    );

    const sessionDuration = Date.now() - sessionStart;

    // Calculate collaboration score based on participation and interaction
    const collaborationScore = Math.min(
      100,
      activeParticipants * 20 + session.codeHistory.length * 2 + (sessionDuration > 300000 ? 20 : 0) // Bonus for longer sessions
    );

    return {
      totalParticipants: session.participants.size,
      activeParticipants,
      codeChanges: session.codeHistory.length,
      sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
      collaborationScore,
    };
  }
}
