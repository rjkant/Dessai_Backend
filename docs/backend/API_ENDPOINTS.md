# API Endpoints Specification
version: "1.0.0"
last_updated: "2025-08-12"
persona: "Technical Strategy Advisor"

## Complete API Reference

This document provides the comprehensive API specification for all Dessai backend services, including REST endpoints, GraphQL schemas, and WebSocket events.

## Base Configuration

### API Gateway
```
Base URL: https://api.dessai.com/v1
GraphQL Endpoint: https://api.dessai.com/graphql
WebSocket: wss://api.dessai.com/ws
```

### Authentication
```http
Authorization: Bearer <JWT_TOKEN>
X-API-Key: <API_KEY>  # For service-to-service communication
X-Request-ID: <UUID>  # For request tracing
```

### Standard Response Format

#### Success Response
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "type": "resource_type",
    "attributes": {},
    "relationships": {}
  },
  "meta": {
    "timestamp": "2025-08-12T10:00:00Z",
    "request_id": "req_uuid",
    "version": "1.0.0"
  },
  "links": {
    "self": "/api/v1/resource/id",
    "related": "/api/v1/resource/id/relationships"
  }
}
```

#### Error Response
```json
{
  "status": "error",
  "errors": [
    {
      "id": "error_uuid",
      "code": "VALIDATION_ERROR",
      "title": "Validation Failed",
      "detail": "The field 'email' is required",
      "source": {
        "pointer": "/data/attributes/email",
        "parameter": "email"
      },
      "meta": {
        "field": "email",
        "rule": "required"
      }
    }
  ],
  "meta": {
    "timestamp": "2025-08-12T10:00:00Z",
    "request_id": "req_uuid"
  }
}
```

## User Management Service API

### Authentication Endpoints

#### POST /auth/login
Login with email and password
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "remember_me": true,
  "device_info": {
    "user_agent": "Mozilla/5.0...",
    "platform": "web",
    "fingerprint": "device_fingerprint_hash"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://cdn.dessai.com/avatars/usr_123.jpg"
      },
      "permissions": ["assessment:read", "assessment:create"],
      "organizations": [
        {
          "id": "org_456",
          "name": "Tech Corp",
          "role": "admin"
        }
      ]
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIs...",
      "refresh_token": "rt_secure_token_here",
      "expires_in": 900,
      "token_type": "Bearer"
    },
    "session": {
      "id": "sess_789",
      "expires_at": "2025-08-13T10:00:00Z"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "rt_secure_token_here"
}
```

#### POST /auth/logout
Logout and invalidate tokens
```http
POST /auth/logout
Authorization: Bearer <token>

{
  "invalidate_all_sessions": false
}
```

#### POST /auth/mfa/setup
Set up multi-factor authentication
```http
POST /auth/mfa/setup
Authorization: Bearer <token>

{
  "method": "totp", // totp, webauthn, sms
  "phone": "+1234567890" // for SMS method
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "method": "totp",
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backup_codes": [
      "123456789",
      "987654321"
    ]
  }
}
```

#### POST /auth/mfa/verify
Verify MFA during login
```http
POST /auth/mfa/verify
Content-Type: application/json

{
  "session_id": "temp_session_123",
  "method": "totp",
  "code": "123456"
}
```

### User Management Endpoints

#### GET /users/profile
Get current user profile
```http
GET /users/profile
Authorization: Bearer <token>
```

#### PUT /users/profile
Update user profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Senior Software Engineer",
  "skills": ["JavaScript", "Python", "React"],
  "experience_level": "senior",
  "timezone": "America/New_York",
  "notification_preferences": {
    "email_assessments": true,
    "email_results": true,
    "sms_reminders": false
  }
}
```

#### POST /users/change-password
Change user password
```http
POST /users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "old_password",
  "new_password": "new_secure_password",
  "confirm_password": "new_secure_password"
}
```

### Organization Management Endpoints

#### GET /organizations
List user's organizations
```http
GET /organizations
Authorization: Bearer <token>
```

#### POST /organizations
Create new organization
```http
POST /organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tech Corp",
  "slug": "techcorp",
  "domain": "techcorp.com",
  "industry": "technology",
  "company_size": "medium",
  "subscription_plan": "professional"
}
```

#### GET /organizations/{org_id}
Get organization details
```http
GET /organizations/org_456
Authorization: Bearer <token>
```

#### PUT /organizations/{org_id}
Update organization
```http
PUT /organizations/org_456
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tech Corporation",
  "description": "Leading technology company",
  "website_url": "https://techcorp.com",
  "settings": {
    "assessment_defaults": {
      "proctoring_enabled": true,
      "time_limit": 120,
      "max_attempts": 2
    }
  }
}
```

#### POST /organizations/{org_id}/invitations
Invite user to organization
```http
POST /organizations/org_456/invitations
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "interviewer",
  "permissions": ["assessment:create", "assessment:manage"],
  "custom_message": "Welcome to our technical assessment team!"
}
```

#### GET /organizations/{org_id}/members
List organization members
```http
GET /organizations/org_456/members?page=1&limit=20&role=admin
Authorization: Bearer <token>
```

## Assessment Service API

### Assessment Management Endpoints

#### GET /assessments
List assessments with filtering
```http
GET /assessments?organization_id=org_456&status=published&type=coding_challenge&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "assess_123",
      "type": "assessment",
      "attributes": {
        "title": "Senior Frontend Developer Assessment",
        "description": "Comprehensive React and JavaScript evaluation",
        "type": "coding_challenge",
        "status": "published",
        "estimated_duration": 120,
        "question_count": 5,
        "difficulty": "senior",
        "tags": ["react", "javascript", "frontend"],
        "created_at": "2025-08-10T10:00:00Z",
        "updated_at": "2025-08-11T15:30:00Z"
      },
      "relationships": {
        "organization": {
          "data": {"id": "org_456", "type": "organization"}
        },
        "created_by": {
          "data": {"id": "usr_789", "type": "user"}
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    },
    "filters": {
      "status": "published",
      "type": "coding_challenge"
    }
  }
}
```

#### POST /assessments
Create new assessment
```http
POST /assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Backend Developer Assessment",
  "description": "Comprehensive Node.js and system design evaluation",
  "type": "mixed",
  "configuration": {
    "duration": 180,
    "max_attempts": 1,
    "randomize_questions": true,
    "show_results": false,
    "proctoring_enabled": true,
    "proctoring_settings": {
      "video_monitoring": true,
      "audio_monitoring": true,
      "screen_sharing": false,
      "behavioral_analysis": true
    },
    "code_execution_enabled": true,
    "allowed_languages": ["javascript", "python", "java"],
    "passing_score": 70.0,
    "start_date": "2025-08-15T09:00:00Z",
    "end_date": "2025-08-30T17:00:00Z"
  },
  "instructions": "Complete all questions within the time limit. Code execution is available for programming questions.",
  "tags": ["nodejs", "backend", "system-design"]
}
```

#### GET /assessments/{assessment_id}
Get assessment details
```http
GET /assessments/assess_123
Authorization: Bearer <token>
```

#### PUT /assessments/{assessment_id}
Update assessment
```http
PUT /assessments/assess_123
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Assessment Title",
  "configuration": {
    "duration": 150,
    "passing_score": 75.0
  },
  "status": "published"
}
```

#### DELETE /assessments/{assessment_id}
Delete/archive assessment
```http
DELETE /assessments/assess_123
Authorization: Bearer <token>
```

### Question Management Endpoints

#### GET /questions
Search and list questions
```http
GET /questions?q=javascript&difficulty=medium&type=coding&tags=react,frontend&page=1&limit=20
Authorization: Bearer <token>
```

#### POST /questions
Create new question
```http
POST /questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement Binary Search Tree",
  "description": "Create a BST class with insert, search, and delete methods",
  "type": "coding",
  "difficulty": "medium",
  "estimated_time": 45,
  "points": 10.0,
  "language": "javascript",
  "content": {
    "problem_statement": "Implement a Binary Search Tree...",
    "function_signature": "class BST {\n  constructor() {\n    this.root = null;\n  }\n  \n  insert(value) {\n    // Your implementation\n  }\n}",
    "constraints": [
      "1 <= value <= 10^4",
      "Maximum 1000 operations"
    ],
    "examples": [
      {
        "input": "bst.insert(5); bst.insert(3); bst.search(3)",
        "output": "true",
        "explanation": "3 is found in the BST"
      }
    ]
  },
  "test_cases": [
    {
      "input": "const bst = new BST(); bst.insert(5); bst.insert(3); return bst.search(3);",
      "expected_output": "true",
      "is_hidden": false
    },
    {
      "input": "const bst = new BST(); bst.insert(5); return bst.search(10);",
      "expected_output": "false",
      "is_hidden": true
    }
  ],
  "tags": ["binary-tree", "data-structures", "algorithms"],
  "categories": ["data-structures"]
}
```

#### GET /questions/{question_id}
Get question details
```http
GET /questions/q_456
Authorization: Bearer <token>
```

#### PUT /questions/{question_id}
Update question
```http
PUT /questions/q_456
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Question Title",
  "difficulty": "hard",
  "estimated_time": 60
}
```

### Assessment Session Endpoints

#### POST /assessments/{assessment_id}/sessions
Start assessment session
```http
POST /assessments/assess_123/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "candidate_id": "usr_candidate_123", // Optional for invited assessments
  "invitation_token": "inv_token_456", // If accessed via invitation
  "browser_info": {
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "session": {
      "id": "session_789",
      "assessment_id": "assess_123",
      "candidate_id": "usr_candidate_123",
      "status": "started",
      "started_at": "2025-08-12T10:00:00Z",
      "time_limit": 7200, // seconds
      "current_question_index": 0,
      "total_questions": 5,
      "configuration": {
        "proctoring_enabled": true,
        "code_execution_enabled": true,
        "allowed_languages": ["javascript", "python"]
      }
    },
    "first_question": {
      "id": "q_456",
      "title": "Array Manipulation",
      "type": "coding",
      "content": {...},
      "time_limit": 1800
    },
    "proctoring_session": {
      "id": "proctor_session_111",
      "websocket_url": "wss://api.dessai.com/proctoring/session_789",
      "configuration": {
        "video_required": true,
        "audio_required": true,
        "screen_sharing": false
      }
    }
  }
}
```

#### GET /sessions/{session_id}
Get session status and progress
```http
GET /sessions/session_789
Authorization: Bearer <token>
```

#### POST /sessions/{session_id}/submissions
Submit answer to question
```http
POST /sessions/session_789/submissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "question_id": "q_456",
  "answer": {
    "type": "code",
    "language": "javascript",
    "code": "function solution(arr) {\n  return arr.sort((a, b) => a - b);\n}",
    "test_results": [
      {
        "test_case_id": "tc_1",
        "passed": true,
        "execution_time": 45
      }
    ]
  },
  "time_taken": 450 // seconds
}
```

#### GET /sessions/{session_id}/questions/{question_id}
Get specific question in session
```http
GET /sessions/session_789/questions/q_456
Authorization: Bearer <token>
```

#### POST /sessions/{session_id}/complete
Complete assessment session
```http
POST /sessions/session_789/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "force_submit": false // Submit even if not all questions answered
}
```

## Code Execution Service API

### Code Execution Endpoints

#### POST /execute
Execute code with test cases
```http
POST /execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "javascript",
  "code": "function solution(arr) {\n  return arr.sort((a, b) => a - b);\n}",
  "test_cases": [
    {
      "id": "tc_1",
      "input": "solution([3, 1, 4, 1, 5])",
      "expected_output": "[1, 1, 3, 4, 5]"
    }
  ],
  "time_limit": 30, // seconds
  "memory_limit": 128, // MB
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "execution_id": "exec_123",
    "status": "completed",
    "results": [
      {
        "test_case_id": "tc_1",
        "status": "passed",
        "output": "[1, 1, 3, 4, 5]",
        "expected": "[1, 1, 3, 4, 5]",
        "execution_time": 45, // milliseconds
        "memory_used": 12 // MB
      }
    ],
    "overall": {
      "passed": 1,
      "failed": 0,
      "total": 1,
      "total_execution_time": 45,
      "max_memory_used": 12
    },
    "compilation": {
      "success": true,
      "output": "",
      "errors": ""
    }
  }
}
```

#### GET /execute/{execution_id}/status
Check execution status
```http
GET /execute/exec_123/status
Authorization: Bearer <token>
```

#### GET /execute/{execution_id}/result
Get execution results
```http
GET /execute/exec_123/result
Authorization: Bearer <token>
```

#### POST /validate
Validate code syntax without execution
```http
POST /validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "javascript",
  "code": "function solution(arr) {\n  return arr.sort((a, b) => a - b;\n}" // Missing closing parenthesis
}
```

## Proctoring Service API

### Proctoring Session Endpoints

#### POST /proctoring/sessions
Initialize proctoring session
```http
POST /proctoring/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessment_session_id": "session_789",
  "configuration": {
    "video_monitoring": true,
    "audio_monitoring": true,
    "screen_sharing": false,
    "behavioral_analysis": true,
    "face_detection": true,
    "environment_monitoring": true,
    "integrity_checks": true
  },
  "candidate_info": {
    "id": "usr_candidate_123",
    "reference_image": "base64_encoded_image", // For face verification
    "verification_method": "live_photo"
  }
}
```

#### GET /proctoring/sessions/{session_id}
Get proctoring session details
```http
GET /proctoring/sessions/proctor_session_111
Authorization: Bearer <token>
```

#### POST /proctoring/sessions/{session_id}/events
Log proctoring events
```http
POST /proctoring/sessions/proctor_session_111/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "events": [
    {
      "type": "face_not_detected",
      "severity": "medium",
      "timestamp": "2025-08-12T10:15:30Z",
      "details": {
        "duration": 5000, // milliseconds
        "confidence": 0.85
      }
    },
    {
      "type": "multiple_faces",
      "severity": "high",
      "timestamp": "2025-08-12T10:18:45Z",
      "details": {
        "face_count": 2,
        "confidence": 0.92
      }
    }
  ]
}
```

#### GET /proctoring/sessions/{session_id}/integrity-report
Generate integrity report
```http
GET /proctoring/sessions/proctor_session_111/integrity-report
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "session_id": "proctor_session_111",
    "assessment_session_id": "session_789",
    "integrity_score": 87.5,
    "risk_level": "low",
    "category_scores": {
      "identity_verification": 95.0,
      "environment_integrity": 85.0,
      "behavioral_analysis": 82.0,
      "technical_compliance": 88.0
    },
    "violations": [
      {
        "type": "brief_absence",
        "severity": "low",
        "count": 2,
        "total_duration": 8000,
        "description": "Candidate briefly left the camera view"
      }
    ],
    "recommendations": [
      "Review video footage around timestamp 10:18:45",
      "Consider follow-up interview for behavioral anomalies"
    ],
    "generated_at": "2025-08-12T11:00:00Z"
  }
}
```

## Analytics Service API

### Performance Analytics Endpoints

#### GET /analytics/assessments/{assessment_id}/metrics
Get assessment performance metrics
```http
GET /analytics/assessments/assess_123/metrics?time_range=30d&group_by=day
Authorization: Bearer <token>
```

#### GET /analytics/organizations/{org_id}/dashboard
Get organization analytics dashboard
```http
GET /analytics/organizations/org_456/dashboard?time_range=90d
Authorization: Bearer <token>
```

#### GET /analytics/candidates/{candidate_id}/performance
Get candidate performance analysis
```http
GET /analytics/candidates/usr_candidate_123/performance
Authorization: Bearer <token>
```

#### POST /analytics/reports
Generate custom analytics report
```http
POST /analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q3 Hiring Performance Report",
  "type": "hiring_funnel",
  "filters": {
    "organization_id": "org_456",
    "date_range": {
      "start": "2025-07-01T00:00:00Z",
      "end": "2025-09-30T23:59:59Z"
    },
    "assessment_types": ["coding_challenge", "system_design"],
    "positions": ["senior_engineer", "staff_engineer"]
  },
  "metrics": [
    "completion_rate",
    "average_score",
    "time_to_complete",
    "pass_rate",
    "bias_indicators"
  ],
  "format": "pdf" // pdf, csv, json
}
```

## Notification Service API

### Notification Endpoints

#### POST /notifications/send
Send notification
```http
POST /notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "assessment_invitation",
  "recipients": [
    {
      "email": "candidate@example.com",
      "name": "Jane Smith",
      "personalization": {
        "assessment_title": "Senior Developer Assessment",
        "company_name": "Tech Corp",
        "deadline": "2025-08-20T17:00:00Z"
      }
    }
  ],
  "channels": ["email"],
  "template_id": "assessment_invitation_v2",
  "priority": "normal", // low, normal, high, urgent
  "schedule_at": "2025-08-13T09:00:00Z", // Optional
  "metadata": {
    "assessment_id": "assess_123",
    "organization_id": "org_456"
  }
}
```

#### GET /notifications/{notification_id}/status
Get notification delivery status
```http
GET /notifications/notif_789/status
Authorization: Bearer <token>
```

#### GET /notifications/templates
List notification templates
```http
GET /notifications/templates?category=assessment&language=en
Authorization: Bearer <token>
```

#### POST /notifications/templates
Create notification template
```http
POST /notifications/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom Assessment Invitation",
  "category": "assessment",
  "language": "en",
  "channels": ["email", "sms"],
  "content": {
    "email": {
      "subject": "You're invited to complete {{assessment_title}}",
      "html": "<h1>Assessment Invitation</h1><p>Dear {{name}}, you've been invited...</p>",
      "text": "Assessment Invitation\n\nDear {{name}}, you've been invited..."
    },
    "sms": {
      "message": "Hi {{name}}, you're invited to complete the {{assessment_title}} assessment. Link: {{assessment_link}}"
    }
  },
  "variables": [
    {"name": "name", "type": "string", "required": true},
    {"name": "assessment_title", "type": "string", "required": true},
    {"name": "assessment_link", "type": "url", "required": true}
  ]
}
```

## Integration Services API

### ATS Integration Endpoints

#### GET /integrations/ats
List ATS integrations
```http
GET /integrations/ats?organization_id=org_456
Authorization: Bearer <token>
```

#### POST /integrations/ats
Create ATS integration
```http
POST /integrations/ats
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "greenhouse",
  "organization_id": "org_456",
  "configuration": {
    "api_key": "gh_api_key_here",
    "webhook_secret": "webhook_secret",
    "sync_candidates": true,
    "sync_jobs": true,
    "auto_create_assessments": false
  },
  "field_mappings": {
    "candidate_email": "email_addresses[0].value",
    "candidate_name": "first_name + ' ' + last_name",
    "job_title": "jobs[0].name"
  }
}
```

#### POST /integrations/ats/{integration_id}/sync
Trigger manual sync
```http
POST /integrations/ats/ats_int_123/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "sync_type": "candidates", // candidates, jobs, both
  "force_update": false
}
```

#### POST /integrations/ats/webhooks/{provider}
Receive ATS webhooks
```http
POST /integrations/ats/webhooks/greenhouse
X-Greenhouse-Event-Type: candidate_created
X-Greenhouse-Signature: signature_here
Content-Type: application/json

{
  "action": "candidate_created",
  "payload": {
    "candidate": {
      "id": 12345,
      "first_name": "John",
      "last_name": "Doe",
      "email_addresses": [
        {
          "value": "john.doe@example.com",
          "type": "personal"
        }
      ]
    }
  }
}
```

### Calendar Integration Endpoints

#### GET /integrations/calendar
List calendar integrations
```http
GET /integrations/calendar?user_id=usr_123
Authorization: Bearer <token>
```

#### POST /integrations/calendar
Connect calendar account
```http
POST /integrations/calendar
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "google",
  "authorization_code": "auth_code_from_oauth",
  "redirect_uri": "https://app.dessai.com/integrations/calendar/callback",
  "default_calendar": true
}
```

#### POST /integrations/calendar/meetings
Schedule assessment meeting
```http
POST /integrations/calendar/meetings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Technical Assessment - Senior Developer",
  "description": "Live coding assessment for senior developer position",
  "start_time": "2025-08-15T14:00:00Z",
  "duration": 120, // minutes
  "attendees": [
    {
      "email": "candidate@example.com",
      "name": "Jane Smith",
      "role": "candidate"
    },
    {
      "email": "interviewer@techcorp.com",
      "name": "Tech Lead",
      "role": "interviewer"
    }
  ],
  "assessment_id": "assess_123",
  "meeting_type": "live_coding",
  "integration_id": "cal_int_456"
}
```

## WebSocket Events

### Real-time Assessment Events

#### Connection
```javascript
const ws = new WebSocket('wss://api.dessai.com/ws/sessions/session_789');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'bearer_token_here'
  }));
};
```

#### Assessment Progress Events
```javascript
// Question navigation
{
  "type": "question_navigation",
  "data": {
    "session_id": "session_789",
    "previous_question": 1,
    "current_question": 2,
    "timestamp": "2025-08-12T10:30:00Z"
  }
}

// Time warning
{
  "type": "time_warning",
  "data": {
    "session_id": "session_789",
    "remaining_time": 300, // seconds
    "warning_type": "5_minutes_left",
    "timestamp": "2025-08-12T10:55:00Z"
  }
}

// Code execution update
{
  "type": "code_execution",
  "data": {
    "session_id": "session_789",
    "question_id": "q_456",
    "execution_id": "exec_123",
    "status": "running", // queued, running, completed, failed
    "timestamp": "2025-08-12T10:32:15Z"
  }
}
```

### Proctoring Events

#### Video Stream Events
```javascript
// Face detection update
{
  "type": "proctoring_event",
  "data": {
    "session_id": "proctor_session_111",
    "event_type": "face_detection",
    "status": "face_detected",
    "confidence": 0.95,
    "face_count": 1,
    "timestamp": "2025-08-12T10:33:00Z"
  }
}

// Integrity violation
{
  "type": "integrity_violation",
  "data": {
    "session_id": "proctor_session_111",
    "violation_type": "multiple_faces",
    "severity": "high",
    "confidence": 0.88,
    "details": {
      "face_count": 2,
      "duration": 5000
    },
    "timestamp": "2025-08-12T10:35:30Z"
  }
}
```

### Collaboration Events (Live Assessments)

#### Collaborative Coding
```javascript
// Code change event
{
  "type": "code_change",
  "data": {
    "session_id": "session_789",
    "question_id": "q_456",
    "user_id": "usr_candidate_123",
    "change": {
      "operation": "insert",
      "position": {"line": 10, "column": 5},
      "content": "console.log('debug');\n"
    },
    "timestamp": "2025-08-12T10:40:00Z"
  }
}

// Cursor position
{
  "type": "cursor_position",
  "data": {
    "session_id": "session_789",
    "user_id": "usr_interviewer_456",
    "position": {"line": 15, "column": 12},
    "timestamp": "2025-08-12T10:40:15Z"
  }
}
```

## GraphQL Schema

### Core Schema Definition
```graphql
# User Management Types
type User {
  id: ID!
  email: String!
  profile: UserProfile!
  organizations: [OrganizationMembership!]!
  permissions: [String!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserProfile {
  firstName: String!
  lastName: String!
  displayName: String
  bio: String
  avatarUrl: String
  skills: [String!]!
  experienceLevel: ExperienceLevel!
  timezone: String!
  locale: String!
}

type Organization {
  id: ID!
  name: String!
  slug: String!
  domain: String
  description: String
  settings: OrganizationSettings!
  members: [OrganizationMembership!]!
  assessments: [Assessment!]!
  createdAt: DateTime!
}

type OrganizationMembership {
  id: ID!
  organization: Organization!
  user: User!
  role: OrganizationRole!
  permissions: [String!]!
  joinedAt: DateTime!
  status: MembershipStatus!
}

# Assessment Types
type Assessment {
  id: ID!
  title: String!
  description: String
  type: AssessmentType!
  status: AssessmentStatus!
  configuration: AssessmentConfiguration!
  questions: [AssessmentQuestion!]!
  sessions: [AssessmentSession!]!
  analytics: AssessmentAnalytics
  createdBy: User!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AssessmentConfiguration {
  duration: Int # minutes
  maxAttempts: Int!
  randomizeQuestions: Boolean!
  showResults: Boolean!
  proctoringEnabled: Boolean!
  proctoringSettings: ProctoringSettings
  codeExecutionEnabled: Boolean!
  allowedLanguages: [String!]!
  passingScore: Float
  startDate: DateTime
  endDate: DateTime
}

type Question {
  id: ID!
  title: String!
  description: String!
  type: QuestionType!
  difficulty: DifficultyLevel!
  estimatedTime: Int! # minutes
  points: Float!
  content: QuestionContent!
  testCases: [TestCase!]!
  tags: [String!]!
  categories: [QuestionCategory!]!
  usage: QuestionUsage!
  createdAt: DateTime!
}

type QuestionContent {
  problemStatement: String!
  functionSignature: String
  constraints: [String!]!
  examples: [QuestionExample!]!
  hints: [String!]!
  explanation: String
}

type AssessmentSession {
  id: ID!
  assessment: Assessment!
  candidate: User!
  status: SessionStatus!
  startedAt: DateTime!
  completedAt: DateTime
  timeSpent: Int # seconds
  currentQuestionIndex: Int!
  progress: SessionProgress!
  submissions: [Submission!]!
  proctoringSession: ProctoringSession
  score: Float
  maxScore: Float
  percentageScore: Float
}

type Submission {
  id: ID!
  session: AssessmentSession!
  question: Question!
  answer: SubmissionAnswer!
  submittedAt: DateTime!
  timeTaken: Int! # seconds
  score: Float
  maxScore: Float
  isCorrect: Boolean
  executionResult: CodeExecutionResult
  analysis: SubmissionAnalysis
}

# Code Execution Types
type CodeExecutionResult {
  id: ID!
  status: ExecutionStatus!
  language: String!
  code: String!
  testResults: [TestResult!]!
  overallResult: OverallExecutionResult!
  compilation: CompilationResult!
  executedAt: DateTime!
}

type TestResult {
  testCaseId: ID!
  status: TestStatus!
  output: String
  expectedOutput: String
  executionTime: Int # milliseconds
  memoryUsed: Int # bytes
  error: String
}

# Proctoring Types
type ProctoringSession {
  id: ID!
  assessmentSession: AssessmentSession!
  configuration: ProctoringConfiguration!
  events: [ProctoringEvent!]!
  integrityReport: IntegrityReport
  startedAt: DateTime!
  endedAt: DateTime
}

type ProctoringEvent {
  id: ID!
  type: ProctoringEventType!
  severity: ViolationSeverity!
  description: String!
  details: ProctoringEventDetails!
  confidence: Float!
  timestamp: DateTime!
}

type IntegrityReport {
  overallScore: Float!
  categoryScores: IntegrityCategoryScores!
  violations: [IntegrityViolation!]!
  patterns: [BehaviorPattern!]!
  riskLevel: RiskLevel!
  recommendations: [String!]!
  generatedAt: DateTime!
}

# Analytics Types
type AssessmentAnalytics {
  totalSessions: Int!
  completionRate: Float!
  averageScore: Float!
  averageTime: Int! # seconds
  difficultyDistribution: DifficultyDistribution!
  performanceByQuestion: [QuestionPerformance!]!
  candidateInsights: [CandidateInsight!]!
  biasIndicators: BiasAnalysis!
}

type OrganizationAnalytics {
  hiringFunnel: HiringFunnelMetrics!
  assessmentMetrics: AssessmentMetrics!
  candidatePerformance: CandidatePerformanceMetrics!
  timeToHire: TimeToHireMetrics!
  diversityMetrics: DiversityMetrics!
}

# Query Root
type Query {
  # User Management
  me: User
  user(id: ID!): User
  organization(id: ID!): Organization
  organizations(filter: OrganizationFilter): [Organization!]!
  
  # Assessment Management
  assessment(id: ID!): Assessment
  assessments(filter: AssessmentFilter, pagination: Pagination): AssessmentConnection!
  question(id: ID!): Question
  questions(filter: QuestionFilter, pagination: Pagination): QuestionConnection!
  
  # Session Management
  assessmentSession(id: ID!): AssessmentSession
  assessmentSessions(filter: SessionFilter): [AssessmentSession!]!
  
  # Analytics
  assessmentAnalytics(assessmentId: ID!, timeRange: TimeRange): AssessmentAnalytics
  organizationAnalytics(organizationId: ID!, timeRange: TimeRange): OrganizationAnalytics
  candidatePerformance(candidateId: ID!): CandidatePerformance
  
  # Search
  searchQuestions(query: String!, filters: QuestionSearchFilters): QuestionSearchResult!
  searchCandidates(query: String!, organizationId: ID!): [User!]!
}

# Mutation Root
type Mutation {
  # Authentication
  login(input: LoginInput!): AuthResponse!
  refreshToken(input: RefreshTokenInput!): AuthResponse!
  logout: Boolean!
  
  # User Management
  updateProfile(input: UpdateProfileInput!): User!
  changePassword(input: ChangePasswordInput!): Boolean!
  enableMFA(input: EnableMFAInput!): MFASetupResult!
  
  # Organization Management
  createOrganization(input: CreateOrganizationInput!): Organization!
  updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
  inviteUser(input: InviteUserInput!): OrganizationInvitation!
  
  # Assessment Management
  createAssessment(input: CreateAssessmentInput!): Assessment!
  updateAssessment(id: ID!, input: UpdateAssessmentInput!): Assessment!
  publishAssessment(id: ID!): Assessment!
  archiveAssessment(id: ID!): Assessment!
  
  # Question Management
  createQuestion(input: CreateQuestionInput!): Question!
  updateQuestion(id: ID!, input: UpdateQuestionInput!): Question!
  deleteQuestion(id: ID!): Boolean!
  
  # Session Management
  startAssessmentSession(input: StartSessionInput!): AssessmentSession!
  submitAnswer(input: SubmitAnswerInput!): Submission!
  completeAssessment(sessionId: ID!): AssessmentSession!
  
  # Code Execution
  executeCode(input: CodeExecutionInput!): CodeExecutionResult!
  validateCode(input: CodeValidationInput!): CodeValidationResult!
  
  # Notifications
  sendNotification(input: SendNotificationInput!): Notification!
  createNotificationTemplate(input: CreateTemplateInput!): NotificationTemplate!
}

# Subscription Root
type Subscription {
  # Assessment Events
  assessmentUpdates(sessionId: ID!): AssessmentUpdate!
  questionProgress(sessionId: ID!): QuestionProgress!
  timeWarnings(sessionId: ID!): TimeWarning!
  
  # Code Execution Events
  codeExecutionUpdates(sessionId: ID!): CodeExecutionUpdate!
  
  # Proctoring Events
  proctoringEvents(sessionId: ID!): ProctoringEvent!
  integrityViolations(sessionId: ID!): IntegrityViolation!
  
  # Collaboration Events (Live Assessments)
  codeChanges(sessionId: ID!): CodeChange!
  cursorPositions(sessionId: ID!): CursorPosition!
  
  # Notifications
  notifications(userId: ID!): Notification!
}

# Enums
enum AssessmentType {
  CODING_CHALLENGE
  TECHNICAL_INTERVIEW
  SYSTEM_DESIGN
  TAKE_HOME
  LIVE_CODING
  MCQ
  MIXED
}

enum QuestionType {
  MULTIPLE_CHOICE
  SINGLE_CHOICE
  CODING
  SQL
  SYSTEM_DESIGN
  ESSAY
  FILE_UPLOAD
  DEBUGGING
  CODE_REVIEW
}

enum DifficultyLevel {
  BEGINNER
  EASY
  MEDIUM
  HARD
  EXPERT
}

enum SessionStatus {
  SCHEDULED
  STARTED
  IN_PROGRESS
  PAUSED
  COMPLETED
  SUBMITTED
  TIMED_OUT
  TERMINATED
  UNDER_REVIEW
}

enum ExecutionStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  TIMEOUT
  MEMORY_EXCEEDED
}

enum ViolationSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

# Input Types
input CreateAssessmentInput {
  title: String!
  description: String
  type: AssessmentType!
  configuration: AssessmentConfigurationInput!
  questionIds: [ID!]!
  tags: [String!]
}

input AssessmentConfigurationInput {
  duration: Int
  maxAttempts: Int!
  randomizeQuestions: Boolean!
  showResults: Boolean!
  proctoringEnabled: Boolean!
  proctoringSettings: ProctoringSettingsInput
  codeExecutionEnabled: Boolean!
  allowedLanguages: [String!]!
  passingScore: Float
  startDate: DateTime
  endDate: DateTime
}

input CreateQuestionInput {
  title: String!
  description: String!
  type: QuestionType!
  difficulty: DifficultyLevel!
  estimatedTime: Int!
  points: Float!
  content: QuestionContentInput!
  testCases: [TestCaseInput!]!
  tags: [String!]!
  categoryIds: [ID!]!
}

input SubmitAnswerInput {
  sessionId: ID!
  questionId: ID!
  answer: SubmissionAnswerInput!
  timeTaken: Int!
}

input CodeExecutionInput {
  language: String!
  code: String!
  testCases: [TestCaseInput!]!
  timeLimit: Int
  memoryLimit: Int
  sessionId: ID
}

# Custom Scalars
scalar DateTime
scalar JSON
```

This comprehensive API specification provides:

1. **Complete REST API endpoints** for all services with detailed request/response examples
2. **WebSocket event specifications** for real-time features
3. **GraphQL schema** for complex queries and real-time subscriptions
4. **Authentication and security** patterns throughout
5. **Error handling** standards and examples
6. **Integration endpoints** for external systems
7. **Analytics and reporting** APIs

The specification follows REST best practices, uses consistent naming conventions, includes proper HTTP status codes, and provides comprehensive examples for implementation.

**Suggested commit message:** `docs: add comprehensive API endpoints specification with REST, GraphQL, and WebSocket definitions`
