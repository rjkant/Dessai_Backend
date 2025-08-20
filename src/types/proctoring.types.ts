/**
 * Proctoring System Types
 * Comprehensive type definitions for WebRTC-based proctoring service
 * Epic 4 Task 4.1: WebRTC Media Streaming
 */

// Browser API Type Extensions
declare global {
  interface MediaDeviceInfo {
    deviceId: string;
    groupId: string;
    kind: 'audioinput' | 'audiooutput' | 'videoinput';
    label: string;
  }

  interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
    credentialType?: RTCIceCredentialType;
  }

  interface RTCSessionDescriptionInit {
    type: 'answer' | 'offer' | 'pranswer' | 'rollback';
    sdp?: string;
  }

  type RTCIceCredentialType = 'password' | 'oauth';

  interface RTCCertificate {
    expires: number;
    fingerprints: RTCDtlsFingerprint[];
    getFingerprints(): RTCDtlsFingerprint[];
  }

  interface RTCDtlsFingerprint {
    algorithm?: string;
    value?: string;
  }
}

export interface MediaStreamConfig {
  id: string;
  sessionId: string;
  userId: string;
  type: MediaStreamType;
  constraints: MediaStreamConstraints;
  quality: StreamQuality;
  recording: RecordingConfig;
  monitoring: MonitoringConfig;
}

export enum MediaStreamType {
  VIDEO = 'video',
  AUDIO = 'audio',
  SCREEN = 'screen',
  COMBINED = 'combined'
}

export enum StreamQuality {
  LOW = 'low',       // 320x240, 15fps
  MEDIUM = 'medium', // 640x480, 30fps
  HIGH = 'high',     // 1280x720, 30fps
  HD = 'hd'          // 1920x1080, 30fps
}

export interface MediaStreamConstraints {
  video: VideoConstraints | boolean;
  audio: AudioConstraints | boolean;
  screen?: ScreenConstraints;
}

export interface VideoConstraints {
  width: { min: number; ideal: number; max: number };
  height: { min: number; ideal: number; max: number };
  frameRate: { min: number; ideal: number; max: number };
  facingMode?: 'user' | 'environment';
  aspectRatio?: number;
}

export interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate?: number;
  sampleSize?: number;
}

export interface ScreenConstraints {
  cursor: 'always' | 'motion' | 'never';
  displaySurface: 'application' | 'browser' | 'monitor' | 'window';
  logicalSurface: boolean;
}

export interface RecordingConfig {
  enabled: boolean;
  format: 'webm' | 'mp4';
  codecs: {
    video: 'vp8' | 'vp9' | 'h264';
    audio: 'opus' | 'aac';
  };
  bitRate: {
    video: number; // kbps
    audio: number; // kbps
  };
  storage: StorageConfig;
  retention: RetentionPolicy;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'azure' | 'gcp';
  bucket?: string;
  path: string;
  encryption: boolean;
  compression: boolean;
}

export interface RetentionPolicy {
  duration: number; // days
  autoDelete: boolean;
  archiveAfter?: number; // days
}

export interface MonitoringConfig {
  faceDetection: boolean;
  gazeTracking: boolean;
  audioAnalysis: boolean;
  behaviorAnalysis: boolean;
  integrityChecks: boolean;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  multipleFaces: number;
  noFaceDetected: number; // seconds
  lookAwayDuration: number; // seconds
  audioAnomalies: number;
  suspiciousActivity: number;
}

export interface WebRTCSession {
  id: string;
  sessionId: string;
  userId: string;
  organizationId: string;
  status: SessionStatus;
  mediaStreams: MediaStreamInfo[];
  peerConnection: RTCPeerConnectionConfig;
  signaling: SignalingConfig;
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum SessionStatus {
  INITIALIZING = 'initializing',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  MONITORING = 'monitoring',
  PAUSED = 'paused',
  DISCONNECTED = 'disconnected',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface MediaStreamInfo {
  id: string;
  type: MediaStreamType;
  status: StreamStatus;
  quality: StreamQuality;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  recordingPath?: string;
  metadata: StreamMetadata;
}

export enum StreamStatus {
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface StreamMetadata {
  resolution?: string;
  frameRate?: number;
  bitRate?: number;
  codec?: string;
  bandwidth?: number;
  packetLoss?: number;
  jitter?: number;
  latency?: number;
}

export interface RTCPeerConnectionConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy: 'all' | 'relay';
  bundlePolicy: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy: 'negotiate' | 'require';
  certificates?: RTCCertificate[];
}

export interface SignalingConfig {
  server: string;
  protocol: 'websocket' | 'socket.io';
  authentication: boolean;
  encryption: boolean;
  heartbeat: number; // seconds
}

export interface SessionMetadata {
  assessmentId?: string;
  participationId?: string;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
  browserInfo: BrowserInfo;
  permissions: MediaPermissions;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  screenResolution: string;
  availableResolution: string;
  colorDepth: number;
  pixelRatio: number;
  timezone: string;
  language: string;
}

export interface NetworkInfo {
  connection?: NetworkConnection;
  bandwidth?: BandwidthInfo;
  latency?: number;
  ipAddress?: string;
  geolocation?: GeolocationInfo;
}

export interface NetworkConnection {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface BandwidthInfo {
  download: number; // Mbps
  upload: number;   // Mbps
  ping: number;     // ms
}

export interface GeolocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  country?: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  webrtcSupport: WebRTCSupport;
  mediaDevices: MediaDevicesInfo;
}

export interface WebRTCSupport {
  peerConnection: boolean;
  getUserMedia: boolean;
  getDisplayMedia: boolean;
  mediaRecorder: boolean;
  dataChannel: boolean;
}

export interface MediaDevicesInfo {
  videoInputs: MediaDeviceInfo[];
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export interface MediaPermissions {
  camera: PermissionState;
  microphone: PermissionState;
  screen: PermissionState;
  notifications: PermissionState;
  geolocation: PermissionState;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

// WebRTC Events and Messages
export interface WebRTCEvent {
  type: WebRTCEventType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: any;
  severity: EventSeverity;
}

export enum WebRTCEventType {
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  STREAM_STARTED = 'stream_started',
  STREAM_ENDED = 'stream_ended',
  CONNECTION_STATE_CHANGED = 'connection_state_changed',
  ICE_CONNECTION_STATE_CHANGED = 'ice_connection_state_changed',
  SIGNALING_STATE_CHANGED = 'signaling_state_changed',
  DATA_CHANNEL_OPEN = 'data_channel_open',
  DATA_CHANNEL_CLOSED = 'data_channel_closed',
  ERROR_OCCURRED = 'error_occurred',
  QUALITY_CHANGED = 'quality_changed',
  BANDWIDTH_CHANGED = 'bandwidth_changed',
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped'
}

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// API Request/Response Types
export interface CreateWebRTCSessionRequest {
  sessionId: string;
  userId: string;
  assessmentId?: string;
  config: Partial<MediaStreamConfig>;
  settings: SessionSettings;
}

export interface SessionSettings {
  enableVideo: boolean;
  enableAudio: boolean;
  enableScreenShare: boolean;
  enableRecording: boolean;
  enableMonitoring: boolean;
  quality: StreamQuality;
  monitoringLevel: MonitoringLevel;
}

export enum MonitoringLevel {
  NONE = 'none',
  BASIC = 'basic',     // Face detection only
  STANDARD = 'standard', // Face + gaze tracking
  ADVANCED = 'advanced', // All AI monitoring
  STRICT = 'strict'    // Maximum security
}

export interface CreateWebRTCSessionResponse {
  session: WebRTCSession;
  offer?: RTCSessionDescriptionInit;
  iceServers: RTCIceServer[];
  signalingServer: string;
  token: string;
}

export interface WebRTCSignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum SignalingMessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  BYE = 'bye',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error'
}

// Quality Monitoring Types
export interface StreamQualityMetrics {
  sessionId: string;
  streamId: string;
  timestamp: Date;
  metrics: QualityMetrics;
}

export interface QualityMetrics {
  video?: VideoQualityMetrics;
  audio?: AudioQualityMetrics;
  network?: NetworkQualityMetrics;
}

export interface VideoQualityMetrics {
  resolution: string;
  frameRate: number;
  bitRate: number;
  framesDropped: number;
  framesCorrupted: number;
  jitter: number;
  latency: number;
}

export interface AudioQualityMetrics {
  sampleRate: number;
  bitRate: number;
  packetsLost: number;
  jitter: number;
  latency: number;
  audioLevel: number;
}

export interface NetworkQualityMetrics {
  bandwidth: number;
  packetLoss: number;
  rtt: number;
  jitter: number;
  connectionType: string;
}

// Error Types
export interface WebRTCError {
  code: WebRTCErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export enum WebRTCErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  OVERCONSTRAINED = 'OVERCONSTRAINED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  SIGNALING_ERROR = 'SIGNALING_ERROR',
  STREAM_ERROR = 'STREAM_ERROR',
  RECORDING_ERROR = 'RECORDING_ERROR',
  BANDWIDTH_ERROR = 'BANDWIDTH_ERROR',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WebRTCConfig = DeepPartial<MediaStreamConfig>;

export interface ProctoringServiceOptions {
  enableWebRTC: boolean;
  enableRecording: boolean;
  enableAIAnalysis: boolean;
  defaultQuality: StreamQuality;
  iceServers: RTCIceServer[];
  signalingServer: string;
  storageConfig: StorageConfig;
  monitoringConfig: MonitoringConfig;
}
