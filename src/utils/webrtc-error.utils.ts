/**
 * WebRTC Error Utilities
 * TASK-CG-009: WebRTC Media Streaming
 * Persona: Senior Software Engineer
 *
 * Custom error classes for WebRTC operations
 */

export class WebRTCError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'WebRTCError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebRTCError);
    }
  }
}

export class WebRTCSessionError extends WebRTCError {
  constructor(message: string, details?: any) {
    super(message, 'WEBRTC_SESSION_ERROR', 400, details);
    this.name = 'WebRTCSessionError';
  }
}

export class WebRTCMediaError extends WebRTCError {
  constructor(message: string, details?: any) {
    super(message, 'WEBRTC_MEDIA_ERROR', 500, details);
    this.name = 'WebRTCMediaError';
  }
}

export class WebRTCRecordingError extends WebRTCError {
  constructor(message: string, details?: any) {
    super(message, 'WEBRTC_RECORDING_ERROR', 500, details);
    this.name = 'WebRTCRecordingError';
  }
}

export class WebRTCSignalingError extends WebRTCError {
  constructor(message: string, details?: any) {
    super(message, 'WEBRTC_SIGNALING_ERROR', 400, details);
    this.name = 'WebRTCSignalingError';
  }
}
