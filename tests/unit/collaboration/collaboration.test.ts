/**
 * Persona: Quality Assurance Engineer
 * 
 * Comprehensive test suite for Epic 2 Task 2.4: Collaborative Features
 * Testing WebSocket-based real-time collaboration system
 */

import { CollaborationService } from '../../src/services/collaboration.service';
import { CollaborationWebSocketServer } from '../../src/services/collaboration-websocket.service';
import { CollaborationController } from '../../src/controllers/collaboration.controller';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  collaborationSession: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  collaborationEvent: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  assessmentParticipation: {
    findFirst: jest.fn(),
    findMany: jest.fn()
  },
  $transaction: jest.fn()
} as unknown as PrismaClient;

describe('Epic 2 Task 2.4: Collaborative Features', () => {
  let collaborationService: CollaborationService;
  let collaborationController: CollaborationController;
  let wsServer: CollaborationWebSocketServer;
  let httpServer: any;
  const mockSessionId = 'session-123';
  const mockUserId1 = 'user-123';
  const mockUserId2 = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    collaborationService = new CollaborationService(mockPrisma);
    collaborationController = new CollaborationController();
    
    // Create HTTP server for WebSocket testing
    httpServer = createServer();
    wsServer = new CollaborationWebSocketServer(httpServer);
  });

  afterEach(() => {
    if (httpServer) {
      httpServer.close();
    }
    if (wsServer) {
      wsServer.shutdown();
    }
  });

  describe('CollaborationService - Core Functionality', () => {
    describe('Session Management', () => {
      it('should create a new collaboration session', async () => {
        mockPrisma.collaborationSession.findFirst = jest.fn().mockResolvedValue(null);
        mockPrisma.collaborationSession.upsert = jest.fn().mockResolvedValue({
          id: mockSessionId,
          assessmentSessionId: 'assessment-123',
          settings: JSON.stringify({}),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const session = await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'Test User',
          'candidate'
        );

        expect(session).toBeDefined();
        expect(session.participants.size).toBe(1);
        expect(session.participants.has(mockUserId1)).toBe(true);
        expect(mockPrisma.collaborationSession.upsert).toHaveBeenCalled();
      });

      it('should allow users to join existing session', async () => {
        // Setup existing session
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'User One',
          'candidate'
        );

        // Second user joins
        const session = await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId2,
          'User Two',
          'interviewer'
        );

        expect(session.participants.size).toBe(2);
        expect(session.participants.has(mockUserId1)).toBe(true);
        expect(session.participants.has(mockUserId2)).toBe(true);
      });

      it('should handle session leave correctly', async () => {
        // Setup session with two users
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'User One',
          'candidate'
        );
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId2,
          'User Two',
          'interviewer'
        );

        // User leaves
        await collaborationService.leaveSession(mockSessionId, mockUserId1);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        expect(sessionState?.participants.size).toBe(1);
        expect(sessionState?.participants.has(mockUserId2)).toBe(true);
      });
    });

    describe('Real-time Code Synchronization', () => {
      beforeEach(async () => {
        // Setup session
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'User One',
          'candidate'
        );
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId2,
          'User Two',
          'interviewer'
        );
      });

      it('should apply code insertions correctly', async () => {
        const codeChange = {
          sessionId: mockSessionId,
          userId: mockUserId1,
          operation: 'insert' as const,
          position: 0,
          content: 'function hello() {\n'
        };

        mockPrisma.collaborationEvent.create = jest.fn().mockResolvedValue({});

        await collaborationService.applyCodeChange(mockSessionId, mockUserId1, codeChange);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        expect(sessionState?.currentCode).toBe('function hello() {\n');
        expect(mockPrisma.collaborationEvent.create).toHaveBeenCalled();
      });

      it('should apply code deletions correctly', async () => {
        // Setup initial code
        const insertChange = {
          sessionId: mockSessionId,
          userId: mockUserId1,
          operation: 'insert' as const,
          position: 0,
          content: 'function hello() {\n  return "world";\n}\n'
        };

        await collaborationService.applyCodeChange(mockSessionId, mockUserId1, insertChange);

        // Delete part of the code
        const deleteChange = {
          sessionId: mockSessionId,
          userId: mockUserId2,
          operation: 'delete' as const,
          position: 20,
          length: 15,
          content: ''
        };

        await collaborationService.applyCodeChange(mockSessionId, mockUserId2, deleteChange);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        expect(sessionState?.currentCode).not.toContain('return "world";');
      });

      it('should handle concurrent edits with operational transformation', async () => {
        // Initial code: "hello world"
        const initialCode = "hello world";
        
        // Setup session with initial code
        const session = await collaborationService.getSessionState(mockSessionId);
        if (session) {
          session.currentCode = initialCode;
        }

        // Two concurrent insertions
        const change1 = {
          sessionId: mockSessionId,
          userId: mockUserId1,
          operation: 'insert' as const,
          position: 6,
          content: 'beautiful '
        };

        const change2 = {
          sessionId: mockSessionId,
          userId: mockUserId2,
          operation: 'insert' as const,
          position: 6,
          content: 'amazing '
        };

        // Apply changes
        await collaborationService.applyCodeChange(mockSessionId, mockUserId1, change1);
        await collaborationService.applyCodeChange(mockSessionId, mockUserId2, change2);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        expect(sessionState?.currentCode).toContain('beautiful');
        expect(sessionState?.currentCode).toContain('amazing');
      });
    });

    describe('Cursor Position Tracking', () => {
      beforeEach(async () => {
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'User One',
          'candidate'
        );
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId2,
          'User Two',
          'interviewer'
        );
      });

      it('should track cursor positions for multiple users', async () => {
        const cursor1 = { line: 1, column: 10 };
        const cursor2 = { line: 3, column: 5 };

        await collaborationService.updateCursorPosition(mockSessionId, mockUserId1, cursor1);
        await collaborationService.updateCursorPosition(mockSessionId, mockUserId2, cursor2);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        expect(sessionState?.cursors.get(mockUserId1)).toEqual(cursor1);
        expect(sessionState?.cursors.get(mockUserId2)).toEqual(cursor2);
      });

      it('should handle cursor selections', async () => {
        const cursorWithSelection = {
          line: 1,
          column: 5,
          selection: {
            startLine: 1,
            startColumn: 5,
            endLine: 2,
            endColumn: 10
          }
        };

        await collaborationService.updateCursorPosition(mockSessionId, mockUserId1, cursorWithSelection);

        const sessionState = await collaborationService.getSessionState(mockSessionId);
        const storedCursor = sessionState?.cursors.get(mockUserId1);
        expect(storedCursor?.selection).toEqual(cursorWithSelection.selection);
      });
    });

    describe('Conflict Resolution', () => {
      it('should resolve concurrent insertions at same position', () => {
        const change1 = {
          operation: 'insert' as const,
          position: 5,
          content: 'hello',
          timestamp: new Date('2024-01-01T10:00:00Z')
        };

        const change2 = {
          operation: 'insert' as const,
          position: 5,
          content: 'world',
          timestamp: new Date('2024-01-01T10:00:01Z')
        };

        const resolved = collaborationService.resolveConflicts([change1, change2]);
        expect(resolved).toHaveLength(2);
        
        // Second change should have adjusted position
        expect(resolved[1].position).toBeGreaterThan(5);
      });

      it('should handle delete-insert conflicts', () => {
        const deleteChange = {
          operation: 'delete' as const,
          position: 5,
          length: 3,
          content: '',
          timestamp: new Date('2024-01-01T10:00:00Z')
        };

        const insertChange = {
          operation: 'insert' as const,
          position: 6,
          content: 'new',
          timestamp: new Date('2024-01-01T10:00:01Z')
        };

        const resolved = collaborationService.resolveConflicts([deleteChange, insertChange]);
        expect(resolved).toHaveLength(2);
        
        // Insert position should be adjusted based on deletion
        expect(resolved[1].position).toBeLessThan(6);
      });
    });

    describe('Database Persistence', () => {
      it('should persist collaboration sessions to database', async () => {
        const mockSessionData = {
          id: mockSessionId,
          assessmentSessionId: 'assessment-123',
          settings: '{}',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPrisma.collaborationSession.upsert = jest.fn().mockResolvedValue(mockSessionData);

        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'Test User',
          'candidate'
        );

        expect(mockPrisma.collaborationSession.upsert).toHaveBeenCalledWith({
          where: { id: mockSessionId },
          create: expect.objectContaining({
            id: mockSessionId,
            assessmentSessionId: mockSessionId,
            settings: expect.any(String),
            isActive: true
          }),
          update: expect.objectContaining({
            settings: expect.any(String),
            isActive: true,
            updatedAt: expect.any(Date)
          })
        });
      });

      it('should persist collaboration events', async () => {
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'Test User',
          'candidate'
        );

        const codeChange = {
          sessionId: mockSessionId,
          userId: mockUserId1,
          operation: 'insert' as const,
          position: 0,
          content: 'test code'
        };

        mockPrisma.collaborationEvent.create = jest.fn().mockResolvedValue({});

        await collaborationService.applyCodeChange(mockSessionId, mockUserId1, codeChange);

        expect(mockPrisma.collaborationEvent.create).toHaveBeenCalledWith({
          data: {
            sessionId: mockSessionId,
            userId: mockUserId1,
            type: 'code_change',
            data: expect.any(String),
            timestamp: expect.any(Date)
          }
        });
      });
    });

    describe('Session Cleanup', () => {
      it('should clean up inactive sessions', async () => {
        // Create session and mark as inactive
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'Test User',
          'candidate'
        );

        const session = collaborationService.sessions.get(mockSessionId);
        if (session) {
          session.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
        }

        await collaborationService.cleanupInactiveSessions();

        expect(collaborationService.sessions.has(mockSessionId)).toBe(false);
      });

      it('should keep active sessions during cleanup', async () => {
        await collaborationService.createOrJoinSession(
          mockSessionId,
          mockUserId1,
          'Test User',
          'candidate'
        );

        const session = collaborationService.sessions.get(mockSessionId);
        if (session) {
          session.lastActivity = new Date(); // Recent activity
        }

        await collaborationService.cleanupInactiveSessions();

        expect(collaborationService.sessions.has(mockSessionId)).toBe(true);
      });
    });
  });

  describe('CollaborationController - HTTP Endpoints', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {
        user: { id: mockUserId1 },
        params: { sessionId: mockSessionId },
        body: {}
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should handle join session requests', async () => {
      mockReq.body = {
        role: 'candidate',
        userName: 'Test User'
      };

      await collaborationController.joinSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          sessionId: expect.any(String),
          participants: expect.any(Array),
          currentCode: expect.any(String)
        }),
        message: 'Successfully joined collaboration session'
      });
    });

    it('should handle leave session requests', async () => {
      // First join the session
      await collaborationController.joinSession(mockReq, mockRes);
      jest.clearAllMocks();

      await collaborationController.leaveSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully left collaboration session'
      });
    });

    it('should handle code change requests', async () => {
      mockReq.body = {
        operation: 'insert',
        position: 0,
        content: 'test code'
      };

      // First join the session
      await collaborationController.joinSession(mockReq, mockRes);
      jest.clearAllMocks();

      await collaborationController.applyCodeChange(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Code change applied successfully'
      });
    });

    it('should handle cursor update requests', async () => {
      mockReq.body = {
        line: 1,
        column: 5,
        selection: {
          startLine: 1,
          startColumn: 5,
          endLine: 1,
          endColumn: 10
        }
      };

      // First join the session
      await collaborationController.joinSession(mockReq, mockRes);
      jest.clearAllMocks();

      await collaborationController.updateCursor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cursor position updated successfully'
      });
    });

    it('should handle authentication errors', async () => {
      mockReq.user = undefined;

      await collaborationController.joinSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle WebSocket connections with valid authentication', (done) => {
      const mockWs = {
        send: jest.fn(),
        close: jest.fn(),
        on: jest.fn(),
        readyState: 1 // OPEN
      } as unknown as WebSocket;

      // Simulate connection handling
      collaborationController.handleWebSocketConnection(mockWs, mockUserId1);

      // Should send connection acknowledgment
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('connection_ack')
      );

      done();
    });

    it('should handle WebSocket message routing', () => {
      const mockWs = {
        send: jest.fn(),
        close: jest.fn(),
        on: jest.fn(),
        readyState: 1
      } as unknown as WebSocket;

      collaborationController.handleWebSocketConnection(mockWs, mockUserId1);

      // Verify event handlers are set up
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessionPromises = [];
      
      // Create 10 concurrent sessions
      for (let i = 0; i < 10; i++) {
        sessionPromises.push(
          collaborationService.createOrJoinSession(
            `session-${i}`,
            `user-${i}`,
            `User ${i}`,
            'candidate'
          )
        );
      }

      const sessions = await Promise.all(sessionPromises);
      
      expect(sessions).toHaveLength(10);
      expect(collaborationService.sessions.size).toBe(10);
    });

    it('should handle rapid code changes efficiently', async () => {
      await collaborationService.createOrJoinSession(
        mockSessionId,
        mockUserId1,
        'Test User',
        'candidate'
      );

      const changes = [];
      
      // Generate 100 rapid changes
      for (let i = 0; i < 100; i++) {
        changes.push({
          sessionId: mockSessionId,
          userId: mockUserId1,
          operation: 'insert' as const,
          position: i,
          content: `char${i}`
        });
      }

      const startTime = Date.now();
      
      for (const change of changes) {
        await collaborationService.applyCodeChange(mockSessionId, mockUserId1, change);
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 100 changes in under 1 second
      expect(processingTime).toBeLessThan(1000);
    });

    it('should manage memory efficiently for large sessions', async () => {
      await collaborationService.createOrJoinSession(
        mockSessionId,
        mockUserId1,
        'Test User',
        'candidate'
      );

      // Add large amount of code
      const largeCode = 'a'.repeat(100000); // 100KB of text
      
      await collaborationService.applyCodeChange(mockSessionId, mockUserId1, {
        sessionId: mockSessionId,
        userId: mockUserId1,
        operation: 'insert',
        position: 0,
        content: largeCode
      });

      const sessionState = await collaborationService.getSessionState(mockSessionId);
      expect(sessionState?.currentCode.length).toBe(100000);
      
      // Verify session is still functional
      expect(sessionState?.isActive).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should demonstrate end-to-end collaboration workflow', async () => {
    const prismaClient = mockPrisma;
    const collaborationService = new CollaborationService(prismaClient);
    
    // Mock database responses
    mockPrisma.collaborationSession.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.collaborationSession.upsert = jest.fn().mockResolvedValue({
      id: 'session-123',
      assessmentSessionId: 'assessment-123',
      settings: '{}',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockPrisma.collaborationEvent.create = jest.fn().mockResolvedValue({});

    // 1. Candidate joins session
    const candidateSession = await collaborationService.createOrJoinSession(
      'session-123',
      'candidate-1',
      'John Doe',
      'candidate'
    );
    
    expect(candidateSession.participants.size).toBe(1);

    // 2. Interviewer joins session
    const interviewerSession = await collaborationService.createOrJoinSession(
      'session-123',
      'interviewer-1',
      'Jane Smith',
      'interviewer'
    );
    
    expect(interviewerSession.participants.size).toBe(2);

    // 3. Candidate writes code
    await collaborationService.applyCodeChange('session-123', 'candidate-1', {
      sessionId: 'session-123',
      userId: 'candidate-1',
      operation: 'insert',
      position: 0,
      content: 'function fibonacci(n) {\n'
    });

    // 4. Interviewer adds comments
    await collaborationService.applyCodeChange('session-123', 'interviewer-1', {
      sessionId: 'session-123',
      userId: 'interviewer-1',
      operation: 'insert',
      position: 0,
      content: '// Implement the Fibonacci sequence\n'
    });

    // 5. Verify final state
    const finalState = await collaborationService.getSessionState('session-123');
    expect(finalState?.currentCode).toContain('fibonacci');
    expect(finalState?.currentCode).toContain('Fibonacci sequence');
    expect(finalState?.participants.size).toBe(2);
  });
});
