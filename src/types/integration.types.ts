/**
 * Integration Services Type Definitions
 * 
 * Comprehensive type system for external service integrations including:
 * - ATS (Applicant Tracking System) integrations (Greenhouse, Workday, BambooHR)
 * - Calendar integrations (Google Calendar, Microsoft Exchange)
 * - Data mapping and transformation schemas
 * - Webhook handling for external system events
 * - Authentication and authorization for third-party APIs
 * - Rate limiting and request management
 * - Error handling and retry mechanisms
 */

// ============================================================================
// ATS INTEGRATION TYPES
// ============================================================================

/**
 * Supported ATS Systems
 */
export enum ATSProvider {
  GREENHOUSE = 'greenhouse',
  WORKDAY = 'workday',
  BAMBOO_HR = 'bamboo_hr',
  LEVER = 'lever',
  JOBVITE = 'jobvite',
  ICIMS = 'icims',
  SMART_RECRUITERS = 'smart_recruiters',
  TALEO = 'taleo'
}

/**
 * ATS Integration Configuration
 */
export interface ATSConfiguration {
  provider: ATSProvider;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  webhookUrl?: string;
  webhookSecret?: string;
  authType: 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token';
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

/**
 * Candidate Data Model (Standardized)
 */
export interface CandidateData {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  currentTitle?: string;
  currentCompany?: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  };
  availability: {
    startDate?: Date;
    noticePeriod?: number; // days
    relocationWilling?: boolean;
    remoteWilling?: boolean;
  };
  preferences: {
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    jobTypes?: JobType[];
    workArrangements?: WorkArrangement[];
  };
  status: CandidateStatus;
  source: string;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  customFields?: Record<string, any>;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  technologies?: string[];
  achievements?: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  major?: string;
  minor?: string;
  graduationDate?: Date;
  gpa?: number;
  achievements?: string[];
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  TEMPORARY = 'temporary'
}

export enum WorkArrangement {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ON_SITE = 'on_site',
  FLEXIBLE = 'flexible'
}

export enum CandidateStatus {
  NEW = 'new',
  REVIEWING = 'reviewing',
  SCREENING = 'screening',
  INTERVIEWING = 'interviewing',
  TECHNICAL_ASSESSMENT = 'technical_assessment',
  REFERENCE_CHECK = 'reference_check',
  OFFER_PENDING = 'offer_pending',
  OFFER_EXTENDED = 'offer_extended',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  ON_HOLD = 'on_hold'
}

/**
 * Job Position Data Model
 */
export interface JobPosition {
  id: string;
  externalId?: string;
  title: string;
  department: string;
  location: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  workType?: string; // For legacy compatibility
  description: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: {
    required: string[];
    preferred: string[];
  };
  skills: {
    required: string[];
    preferred: string[];
  };
  salary: {
    min?: number;
    max?: number;
    currency?: string;
    type?: 'hourly' | 'annual' | 'project';
  };
  benefits?: string[];
  status: JobPositionStatus;
  openings: number;
  priority: JobPriority;
  hiringManager: {
    id: string;
    name: string;
    email: string;
  };
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  postingDate: Date;
  closingDate?: Date;
  customFields?: Record<string, any>;
}

export enum JobPositionStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  ON_HOLD = 'on_hold',
  CLOSED = 'closed',
  FILLED = 'filled'
}

export enum JobPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * ATS Integration Operations
 */
export interface ATSOperations {
  // Candidate Operations
  getCandidates(filters?: CandidateFilters): Promise<CandidateData[]>;
  getCandidate(id: string): Promise<CandidateData | null>;
  createCandidate(candidate: CreateCandidateRequest): Promise<CandidateData>;
  updateCandidate(id: string, updates: UpdateCandidateRequest): Promise<CandidateData>;
  moveCandidate(id: string, stage: string, jobId?: string): Promise<void>;
  
  // Job Operations
  getJobs(filters?: JobFilters): Promise<JobPosition[]>;
  getJob(id: string): Promise<JobPosition | null>;
  createJob(job: CreateJobRequest): Promise<JobPosition>;
  updateJob(id: string, updates: UpdateJobRequest): Promise<JobPosition>;
  
  // Application Operations
  getApplications(candidateId?: string, jobId?: string): Promise<Application[]>;
  createApplication(application: CreateApplicationRequest): Promise<Application>;
  updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application>;
  
  // Assessment Integration
  createAssessmentInvite(candidateId: string, assessmentId: string): Promise<AssessmentInvite>;
  updateAssessmentResults(inviteId: string, results: AssessmentResults): Promise<void>;
  
  // Webhook Management
  registerWebhook(events: ATSWebhookEvent[], url: string): Promise<WebhookRegistration>;
  unregisterWebhook(id: string): Promise<void>;
}

export interface CandidateFilters {
  status?: CandidateStatus[];
  jobIds?: string[];
  skills?: string[];
  location?: string;
  experience?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface JobFilters {
  status?: JobPositionStatus[];
  department?: string[];
  jobType?: JobType[];
  workArrangement?: WorkArrangement[];
  location?: string[];
  priority?: JobPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface CreateCandidateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];
  currentTitle?: string;
  currentCompany?: string;
  location?: Partial<CandidateData['location']>;
  source?: string;
  jobId?: string;
  customFields?: Record<string, any>;
}

export interface UpdateCandidateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];
  currentTitle?: string;
  currentCompany?: string;
  location?: Partial<CandidateData['location']>;
  status?: CandidateStatus;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, any>;
}

export interface CreateJobRequest {
  title: string;
  department: string;
  location: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: JobPosition['qualifications'];
  skills?: JobPosition['skills'];
  salary?: JobPosition['salary'];
  benefits?: string[];
  openings?: number;
  priority?: JobPriority;
  hiringManagerId: string;
  recruiterId?: string;
  closingDate?: Date;
  customFields?: Record<string, any>;
}

export interface UpdateJobRequest {
  title?: string;
  department?: string;
  location?: string;
  jobType?: JobType;
  workArrangement?: WorkArrangement;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: Partial<JobPosition['qualifications']>;
  skills?: Partial<JobPosition['skills']>;
  salary?: Partial<JobPosition['salary']>;
  benefits?: string[];
  status?: JobPositionStatus;
  openings?: number;
  priority?: JobPriority;
  hiringManagerId?: string;
  recruiterId?: string;
  closingDate?: Date;
  customFields?: Record<string, any>;
}

/**
 * Application Management
 */
export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  stage: string;
  appliedDate: Date;
  source: string;
  coverLetter?: string;
  referredBy?: {
    id: string;
    name: string;
    relationship: string;
  };
  timeline: ApplicationEvent[];
  assessments: AssessmentInvite[];
  interviews: Interview[];
  notes: ApplicationNote[];
  customFields?: Record<string, any>;
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  PHONE_SCREEN = 'phone_screen',
  TECHNICAL_SCREEN = 'technical_screen',
  ON_SITE = 'on_site',
  FINAL_INTERVIEW = 'final_interview',
  REFERENCE_CHECK = 'reference_check',
  BACKGROUND_CHECK = 'background_check',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export interface ApplicationEvent {
  id: string;
  type: ApplicationEventType;
  timestamp: Date;
  description: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: Record<string, any>;
}

export enum ApplicationEventType {
  APPLIED = 'applied',
  STATUS_CHANGED = 'status_changed',
  STAGE_CHANGED = 'stage_changed',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  ASSESSMENT_SENT = 'assessment_sent',
  ASSESSMENT_COMPLETED = 'assessment_completed',
  NOTE_ADDED = 'note_added',
  REFERENCE_CHECK = 'reference_check',
  BACKGROUND_CHECK = 'background_check',
  OFFER_EXTENDED = 'offer_extended',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export interface ApplicationNote {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
  isPrivate: boolean;
  createdAt: Date;
  tags?: string[];
}

export interface CreateApplicationRequest {
  candidateId: string;
  jobId: string;
  source?: string;
  coverLetter?: string;
  referredById?: string;
  customFields?: Record<string, any>;
}

/**
 * Assessment Integration
 */
export interface AssessmentInvite {
  id: string;
  candidateId: string;
  jobId: string;
  assessmentId: string;
  status: AssessmentInviteStatus;
  sentDate: Date;
  dueDate?: Date;
  completedDate?: Date;
  results?: AssessmentResults;
  inviteUrl: string;
  emailTemplate?: string;
  customMessage?: string;
  reminders: AssessmentReminder[];
}

export enum AssessmentInviteStatus {
  PENDING = 'pending',
  SENT = 'sent',
  OPENED = 'opened',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface AssessmentResults {
  overallScore: number;
  maxScore: number;
  percentage: number;
  timeSpent: number; // minutes
  questionResults: QuestionResult[];
  codeResults?: CodeExecutionResult[];
  proctoringResults?: ProctoringAnalysis;
  completedAt: Date;
  feedback?: string;
  recommendation: AssessmentRecommendation;
}

export interface QuestionResult {
  questionId: string;
  type: string;
  score: number;
  maxScore: number;
  timeSpent: number;
  answer: any;
  isCorrect?: boolean;
  feedback?: string;
}

export interface CodeExecutionResult {
  questionId: string;
  language: string;
  code: string;
  testsPassed: number;
  totalTests: number;
  executionTime: number;
  memoryUsage: number;
  codeQuality: {
    readability: number;
    efficiency: number;
    bestPractices: number;
  };
  feedback?: string;
}

export interface ProctoringAnalysis {
  integrityScore: number;
  violations: ProctoringViolation[];
  flags: ProctoringFlag[];
  recommendation: string;
  recordingUrl?: string;
}

export interface ProctoringViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  evidence?: string;
}

export interface ProctoringFlag {
  type: string;
  confidence: number;
  timestamp: Date;
  description: string;
}

export enum AssessmentRecommendation {
  STRONGLY_RECOMMEND = 'strongly_recommend',
  RECOMMEND = 'recommend',
  NEUTRAL = 'neutral',
  NOT_RECOMMEND = 'not_recommend',
  STRONGLY_NOT_RECOMMEND = 'strongly_not_recommend'
}

export interface AssessmentReminder {
  id: string;
  type: 'email' | 'sms';
  scheduledDate: Date;
  sentDate?: Date;
  status: 'scheduled' | 'sent' | 'failed';
  template?: string;
}

/**
 * Interview Management
 */
export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  type: InterviewType;
  round: number;
  status: InterviewStatus;
  scheduledDate: Date;
  duration: number; // minutes
  location?: string;
  meetingUrl?: string;
  meetingId?: string;
  interviewers: Interviewer[];
  questions?: InterviewQuestion[];
  feedback?: InterviewFeedback[];
  notes?: string;
  recordingUrl?: string;
  customFields?: Record<string, any>;
}

export enum InterviewType {
  PHONE_SCREEN = 'phone_screen',
  VIDEO_CALL = 'video_call',
  ON_SITE = 'on_site',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  CULTURE_FIT = 'culture_fit',
  PANEL = 'panel',
  GROUP = 'group'
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show'
}

export interface Interviewer {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isRequired: boolean;
  status: InterviewerStatus;
  joinedAt?: Date;
  leftAt?: Date;
}

export enum InterviewerStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  JOINED = 'joined',
  LEFT = 'left'
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer?: string;
  timeAllotted?: number;
  order: number;
}

export interface InterviewFeedback {
  id: string;
  interviewerId: string;
  rating: number; // 1-5 or 1-10
  maxRating: number;
  strengths: string[];
  weaknesses: string[];
  notes: string;
  recommendation: InterviewRecommendation;
  submittedAt: Date;
  criteria?: FeedbackCriterion[];
}

export enum InterviewRecommendation {
  STRONG_YES = 'strong_yes',
  YES = 'yes',
  MAYBE = 'maybe',
  NO = 'no',
  STRONG_NO = 'strong_no'
}

export interface FeedbackCriterion {
  name: string;
  rating: number;
  maxRating: number;
  weight?: number;
  comments?: string;
}

// ============================================================================
// CALENDAR INTEGRATION TYPES
// ============================================================================

/**
 * Supported Calendar Providers
 */
export enum CalendarProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
  CALDAV = 'caldav'
}

/**
 * Calendar Integration Configuration
 */
export interface CalendarConfiguration {
  provider: CalendarProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl?: string;
  tokenUrl?: string;
  revokeUrl?: string;
  apiVersion?: string;
}

/**
 * Calendar Authentication
 */
export interface CalendarAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string[];
  userId: string;
  provider: CalendarProvider;
}

/**
 * Calendar Event
 */
export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  location?: EventLocation;
  attendees: EventAttendee[];
  organizer: EventOrganizer;
  status: EventStatus;
  visibility: EventVisibility;
  recurrence?: EventRecurrence;
  reminders: EventReminder[];
  conferencing?: EventConferencing;
  attachments?: EventAttachment[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  etag?: string;
}

export interface EventLocation {
  displayName: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  roomId?: string;
  capacity?: number;
}

export interface EventAttendee {
  id?: string;
  email: string;
  name?: string;
  status: AttendeeStatus;
  role: AttendeeRole;
  isRequired: boolean;
  responseDate?: Date;
  comment?: string;
}

export enum AttendeeStatus {
  NEEDS_ACTION = 'needs_action',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

export enum AttendeeRole {
  ORGANIZER = 'organizer',
  ATTENDEE = 'attendee',
  OPTIONAL = 'optional',
  RESOURCE = 'resource'
}

export interface EventOrganizer {
  id?: string;
  email: string;
  name?: string;
  isExternal?: boolean;
}

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled'
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential'
}

export interface EventRecurrence {
  rule: string; // RRULE format
  exceptions?: Date[];
  additions?: Date[];
}

export interface EventReminder {
  method: ReminderMethod;
  minutes: number;
}

export enum ReminderMethod {
  EMAIL = 'email',
  POPUP = 'popup',
  SMS = 'sms'
}

export interface EventConferencing {
  type: ConferencingType;
  url?: string;
  meetingId?: string;
  accessCode?: string;
  dialIn?: ConferencingDialIn[];
  entryPoints?: ConferencingEntryPoint[];
}

export enum ConferencingType {
  GOOGLE_MEET = 'google_meet',
  MICROSOFT_TEAMS = 'microsoft_teams',
  ZOOM = 'zoom',
  WEBEX = 'webex',
  GOTOMEETING = 'gotomeeting',
  HANGOUTS = 'hangouts'
}

export interface ConferencingDialIn {
  region: string;
  number: string;
  accessCode?: string;
}

export interface ConferencingEntryPoint {
  type: 'video' | 'phone' | 'sip' | 'other';
  uri: string;
  label?: string;
  accessCode?: string;
}

export interface EventAttachment {
  id: string;
  title: string;
  mimeType: string;
  fileUrl: string;
  size?: number;
}

/**
 * Calendar Operations
 */
export interface CalendarOperations {
  // Authentication
  getAuthUrl(userId: string, state?: string): Promise<string>;
  exchangeCode(code: string, state?: string): Promise<CalendarAuth>;
  refreshToken(refreshToken: string): Promise<CalendarAuth>;
  revokeAccess(userId: string): Promise<void>;
  
  // Calendar Management
  getCalendars(userId: string): Promise<Calendar[]>;
  getCalendar(userId: string, calendarId: string): Promise<Calendar | null>;
  createCalendar(userId: string, calendar: CreateCalendarRequest): Promise<Calendar>;
  updateCalendar(userId: string, calendarId: string, updates: UpdateCalendarRequest): Promise<Calendar>;
  deleteCalendar(userId: string, calendarId: string): Promise<void>;
  
  // Event Management
  getEvents(userId: string, calendarId: string, options?: GetEventsOptions): Promise<CalendarEvent[]>;
  getEvent(userId: string, calendarId: string, eventId: string): Promise<CalendarEvent | null>;
  createEvent(userId: string, calendarId: string, event: CreateEventRequest): Promise<CalendarEvent>;
  updateEvent(userId: string, calendarId: string, eventId: string, updates: UpdateEventRequest): Promise<CalendarEvent>;
  deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void>;
  
  // Availability
  getFreeBusyInfo(userId: string, timeRange: TimeRange, calendars?: string[]): Promise<FreeBusyInfo>;
  findAvailableSlots(userId: string, requirements: AvailabilityRequirements): Promise<AvailableSlot[]>;
  
  // Meeting Scheduling
  scheduleMeeting(request: ScheduleMeetingRequest): Promise<CalendarEvent>;
  rescheduleEvent(userId: string, calendarId: string, eventId: string, newTime: TimeRange): Promise<CalendarEvent>;
  cancelMeeting(userId: string, calendarId: string, eventId: string, reason?: string): Promise<void>;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  isPrimary: boolean;
  accessRole: CalendarAccessRole;
  backgroundColor?: string;
  foregroundColor?: string;
  isVisible: boolean;
  isEditable: boolean;
  isOwner: boolean;
  canCreateEvents: boolean;
  canModifyEvents: boolean;
  canDeleteEvents: boolean;
  canInviteOthers: boolean;
  canSeeEventDetails: boolean;
  etag?: string;
}

export enum CalendarAccessRole {
  OWNER = 'owner',
  WRITER = 'writer',
  READER = 'reader',
  FREE_BUSY_READER = 'free_busy_reader'
}

export interface CreateCalendarRequest {
  name: string;
  description?: string;
  timezone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  isVisible?: boolean;
}

export interface UpdateCalendarRequest {
  name?: string;
  description?: string;
  timezone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  isVisible?: boolean;
}

export interface GetEventsOptions {
  timeRange?: TimeRange;
  maxResults?: number;
  query?: string;
  orderBy?: 'startTime' | 'updated';
  showDeleted?: boolean;
  singleEvents?: boolean;
  updatedMin?: Date;
}

export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  isAllDay?: boolean;
  location?: Partial<EventLocation>;
  attendees?: CreateAttendeeRequest[];
  visibility?: EventVisibility;
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  conferencing?: CreateConferencingRequest;
  attachments?: string[]; // file URLs
}

export interface CreateAttendeeRequest {
  email: string;
  name?: string;
  isRequired?: boolean;
  role?: AttendeeRole;
}

export interface CreateConferencingRequest {
  type: ConferencingType;
  createNewMeeting?: boolean;
  existingMeetingId?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  isAllDay?: boolean;
  location?: Partial<EventLocation>;
  attendees?: CreateAttendeeRequest[];
  visibility?: EventVisibility;
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  conferencing?: CreateConferencingRequest;
  status?: EventStatus;
}

export interface FreeBusyInfo {
  timeRange: TimeRange;
  calendars: CalendarFreeBusy[];
}

export interface CalendarFreeBusy {
  calendarId: string;
  busyTimes: TimeRange[];
  errors?: string[];
}

export interface AvailabilityRequirements {
  duration: number; // minutes
  timeRange: TimeRange;
  workingHours?: WorkingHours;
  attendees?: string[]; // email addresses
  bufferTime?: number; // minutes before/after
  preferredTimes?: TimeRange[];
  blackoutTimes?: TimeRange[];
  minimumNotice?: number; // minutes
}

export interface WorkingHours {
  timezone: string;
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  start: string; // HH:MM format
  end: string; // HH:MM format
  breaks?: TimeRange[];
}

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  score: number; // 0-1, higher is better
  conflicts: string[]; // reasons why this slot might not be ideal
}

export interface ScheduleMeetingRequest {
  organizerId: string;
  attendees: CreateAttendeeRequest[];
  title: string;
  description?: string;
  duration: number; // minutes
  availabilityRequirements: AvailabilityRequirements;
  location?: Partial<EventLocation>;
  conferencing?: CreateConferencingRequest;
  reminders?: EventReminder[];
  autoSchedule?: boolean; // if false, return suggestions
}

// ============================================================================
// WEBHOOK INTEGRATION TYPES
// ============================================================================

/**
 * Webhook Event Types
 */
export enum ATSWebhookEvent {
  CANDIDATE_CREATED = 'candidate.created',
  CANDIDATE_UPDATED = 'candidate.updated',
  CANDIDATE_DELETED = 'candidate.deleted',
  CANDIDATE_STATUS_CHANGED = 'candidate.status_changed',
  APPLICATION_CREATED = 'application.created',
  APPLICATION_UPDATED = 'application.updated',
  APPLICATION_STATUS_CHANGED = 'application.status_changed',
  JOB_CREATED = 'job.created',
  JOB_UPDATED = 'job.updated',
  JOB_DELETED = 'job.deleted',
  JOB_STATUS_CHANGED = 'job.status_changed',
  INTERVIEW_SCHEDULED = 'interview.scheduled',
  INTERVIEW_COMPLETED = 'interview.completed',
  INTERVIEW_CANCELLED = 'interview.cancelled',
  ASSESSMENT_INVITED = 'assessment.invited',
  ASSESSMENT_COMPLETED = 'assessment.completed',
  OFFER_EXTENDED = 'offer.extended',
  OFFER_ACCEPTED = 'offer.accepted',
  OFFER_REJECTED = 'offer.rejected'
}

export enum CalendarWebhookEvent {
  EVENT_CREATED = 'event.created',
  EVENT_UPDATED = 'event.updated',
  EVENT_DELETED = 'event.deleted',
  EVENT_CANCELLED = 'event.cancelled',
  ATTENDEE_RESPONSE = 'attendee.response',
  CALENDAR_CREATED = 'calendar.created',
  CALENDAR_UPDATED = 'calendar.updated',
  CALENDAR_DELETED = 'calendar.deleted'
}

/**
 * Webhook Registration
 */
export interface WebhookRegistration {
  id: string;
  provider: ATSProvider | CalendarProvider;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: Date;
  lastDelivery?: Date;
  failureCount: number;
  maxFailures: number;
  retryPolicy: WebhookRetryPolicy;
  customFields?: Record<string, any>;
}

export interface WebhookRetryPolicy {
  maxRetries: number;
  baseDelay: number; // seconds
  maxDelay: number; // seconds
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

/**
 * Webhook Payload
 */
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: Date;
  provider: string;
  data: Record<string, any>;
  signature?: string;
  deliveryAttempt: number;
  previousAttempts?: WebhookDeliveryAttempt[];
}

export interface WebhookDeliveryAttempt {
  timestamp: Date;
  statusCode: number;
  responseTime: number;
  error?: string;
}

// ============================================================================
// DATA MAPPING AND TRANSFORMATION TYPES
// ============================================================================

/**
 * Data Mapping Configuration
 */
export interface DataMappingConfig {
  provider: ATSProvider;
  version: string;
  mappings: {
    candidate: FieldMapping[];
    job: FieldMapping[];
    application: FieldMapping[];
  };
  transformations: DataTransformation[];
  validations: DataValidation[];
}

export interface FieldMapping {
  source: string; // external field path
  target: string; // internal field path
  type: 'direct' | 'computed' | 'constant' | 'lookup';
  transformation?: string; // transformation function name
  defaultValue?: any;
  isRequired?: boolean;
  condition?: string; // conditional mapping expression
}

export interface DataTransformation {
  name: string;
  type: 'function' | 'regex' | 'lookup' | 'formula';
  configuration: Record<string, any>;
  description?: string;
}

export interface DataValidation {
  field: string;
  rules: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'type' | 'format' | 'range' | 'custom';
  parameters?: Record<string, any>;
  message?: string;
}

/**
 * Synchronization Status
 */
export interface SyncStatus {
  id: string;
  provider: ATSProvider;
  type: 'candidates' | 'jobs' | 'applications' | 'full';
  status: SyncStatusType;
  startedAt: Date;
  completedAt?: Date;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: SyncError[];
  lastSyncCursor?: string;
  nextSyncScheduled?: Date;
}

export enum SyncStatusType {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SyncError {
  recordId?: string;
  error: string;
  field?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// RATE LIMITING AND REQUEST MANAGEMENT TYPES
// ============================================================================

/**
 * Rate Limiting Configuration
 */
export interface RateLimitConfig {
  provider: ATSProvider | CalendarProvider;
  limits: RateLimit[];
  backoffStrategy: BackoffStrategy;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface RateLimit {
  name: string;
  requestsPerWindow: number;
  windowDuration: number; // seconds
  burstLimit?: number;
  scope: 'global' | 'per_user' | 'per_organization' | 'per_endpoint';
}

export interface BackoffStrategy {
  type: 'fixed' | 'exponential' | 'linear';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier?: number; // for exponential
  jitter?: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  halfOpenMaxCalls: number;
}

/**
 * Request Queue Management
 */
export interface QueuedRequest {
  id: string;
  provider: ATSProvider | CalendarProvider;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  priority: RequestPriority;
  userId?: string;
  organizationId?: string;
  createdAt: Date;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: QueueStatus;
  error?: string;
}

export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
  CRITICAL = 4
}

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Integration Error Types
 */
export enum IntegrationErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  API_UNAVAILABLE = 'api_unavailable',
  INVALID_REQUEST = 'invalid_request',
  DATA_MAPPING_ERROR = 'data_mapping_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface IntegrationError extends Error {
  type: IntegrationErrorType;
  provider: ATSProvider | CalendarProvider;
  statusCode?: number;
  response?: any;
  retryable: boolean;
  context?: Record<string, any>;
}

/**
 * Integration Health Monitoring
 */
export interface IntegrationHealth {
  provider: ATSProvider | CalendarProvider;
  status: HealthStatus;
  lastCheck: Date;
  responseTime: number; // milliseconds
  successRate: number; // 0-1
  errorRate: number; // 0-1
  availabilityScore: number; // 0-1
  issues: HealthIssue[];
  metrics: HealthMetrics;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
}

export interface HealthMetrics {
  requestsPerMinute: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorCount: number;
  timeoutCount: number;
  circuitBreakerTrips: number;
}

// ============================================================================
// AUDIT AND LOGGING TYPES
// ============================================================================

/**
 * Integration Audit Log
 */
export interface IntegrationAuditLog {
  id: string;
  provider: ATSProvider | CalendarProvider;
  operation: string;
  endpoint: string;
  method: string;
  userId?: string;
  organizationId?: string;
  requestId: string;
  timestamp: Date;
  duration: number; // milliseconds
  statusCode?: number;
  success: boolean;
  error?: string;
  requestSize?: number;
  responseSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Integration Analytics
 */
export interface IntegrationAnalytics {
  provider: ATSProvider | CalendarProvider;
  timeRange: TimeRange;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorBreakdown: Record<IntegrationErrorType, number>;
  endpointUsage: Record<string, number>;
  userUsage: Record<string, number>;
  organizationUsage: Record<string, number>;
  costMetrics?: {
    totalCost: number;
    costPerRequest: number;
    currency: string;
  };
}

// ============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Type aliases to match expected names in integration service
 */
export type Candidate = CandidateData;
export type AssessmentResult = AssessmentResults;
export interface CreateAssessmentInviteRequest {
  candidateId: string;
  assessmentId: string;
  jobId?: string;
  dueDate?: Date;
  emailTemplate?: string;
  customMessage?: string;
}
