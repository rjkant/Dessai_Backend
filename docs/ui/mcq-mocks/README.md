# Frontend Components Mock Files

This directory contains comprehensive mock HTML files for all React components in the Dessai frontend application. These mocks demonstrate the visual design, interactions, and various states of each component.

## Assessment Login Flow Components

### 1. Assessment Invitation (`assessment-invitation.html`)
- **Purpose**: Landing page for candidates receiving assessment invitations
- **Features**:
  - Company and position information display
  - Assessment overview with statistics
  - System requirements checklist
  - Step-by-step process guide
  - Responsive design with gradient header
- **Use Cases**: First impression for candidates, assessment preparation

### 2. Assessment Login (`assessment-login.html`)
- **Purpose**: Secure authentication for returning candidates
- **Features**:
  - Email/password login with validation
  - Social authentication (Google, GitHub)
  - Password visibility toggle
  - Remember me functionality
  - Accessibility compliance (WCAG 2.1 AA)
- **Use Cases**: User authentication, security compliance

### 3. Assessment Registration (`assessment-registration.html`)
- **Purpose**: Quick account creation for new candidates
- **Features**:
  - Minimal form with real-time validation
  - Password strength meter
  - Social registration options
  - Terms and privacy acceptance
  - Email availability checking
- **Use Cases**: New user onboarding, data collection compliance

### 4. Login Flow Documentation (`assessment-login-flow-guide.md`)
- **Purpose**: Complete implementation guide and specifications
- **Features**:
  - UX requirements based on competitive analysis
  - Design system specifications
  - Security and accessibility guidelines
  - Integration points and testing strategy
- **Use Cases**: Development reference, stakeholder alignment

## MCQ Assessment Components

### 5. MCQ Screen Mock (`mcq-screen-mock.html`)
- **Purpose**: Complete assessment interface mockup
- **Features**:
  - Full layout with header, timer, question content, and navigation
  - Responsive design (desktop/tablet/mobile)
  - Assessment instructions footer
  - Material Design styling with Inter font
- **Use Cases**: Overall app design review, layout testing, stakeholder demos

### 6. Question Header Mock (`question-header-mock.html`)
- **Purpose**: Question progress and metadata display
- **Features**:
  - Progress bar with question numbering
  - Time remaining and answered count chips
  - Question difficulty, category, type, and points
  - Multiple examples showing different question types
- **Use Cases**: Progress tracking design, question metadata display

### 7. Question Card Mock (`question-card-mock.html`)
- **Purpose**: Interactive question content and options
- **Features**:
  - Single choice, multiple choice, and true/false question types
  - Normal and review mode states
  - Correct/incorrect answer highlighting
  - Explanation boxes for review mode
  - Hover and selection animations
- **Use Cases**: Question interaction design, answer feedback system

### 8. Navigation Controls Mock (`navigation-controls-mock.html`)
- **Purpose**: Assessment navigation and overview
- **Features**:
  - Previous/Next navigation buttons
  - Question overview modal with progress grid
  - Submit confirmation dialog
  - Current question status indicator
  - Interactive demo functionality
- **Use Cases**: Navigation flow design, modal interactions

### 9. Timer Mock (`timer-mock.html`)
- **Purpose**: Assessment timer with warnings
- **Features**:
  - Live countdown display
  - Progress bar showing elapsed time
  - Warning states (critical, low time)
  - Interactive demo with automatic state changes
  - Different time formats (hours:minutes:seconds)
- **Use Cases**: Time management UX, warning system design

### 6. Assessment Results Mock (`assessment-results-mock.html`)
- **Purpose**: Post-assessment results display
- **Features**:
  - Pass/fail scenarios with different score ranges
  - Statistics grid (score, questions answered, time taken)
  - Interactive score generator
  - Action buttons (review answers, retake)
  - Animated results presentation
- **Use Cases**: Results presentation design, celebration/encouragement UX

## Design System

### Colors
- **Primary**: #1976d2 (Blue)
- **Secondary**: #dc004e (Pink)
- **Success**: #4caf50 (Green)
- **Warning**: #ff9800 (Orange)
- **Error**: #f44336 (Red)
- **Background**: #fafafa (Light Gray)
- **Paper**: #ffffff (White)

### Typography
- **Font Family**: Inter, Roboto, Helvetica, Arial
- **Heading Sizes**: 1.25rem to 3rem
- **Body Text**: 0.875rem to 1rem
- **Monospace**: Used for timer displays

### Interactive Elements
- **Buttons**: 8px border radius, hover animations
- **Cards**: 8px border radius, subtle shadows
- **Chips**: 16px border radius, colored backgrounds
- **Progress Bars**: 8px height, rounded corners

## Usage Instructions

### Viewing the Mocks
1. Open any `.html` file in a web browser
2. Files are self-contained with embedded CSS and JavaScript
3. Interactive elements work without additional setup

### Development Reference
- Use these mocks as visual reference during React component development
- Copy CSS styles and adapt for Material-UI components
- Reference interaction patterns for user experience implementation

### Testing Scenarios
Each mock includes multiple states and examples:
- **Normal Operation**: Standard user flow
- **Edge Cases**: Time warnings, perfect scores, failures
- **Responsive Design**: Mobile and desktop layouts
- **Interactive States**: Hover, selection, disabled states

## File Relationships

```
MCQScreen (Main Container)
├── QuestionHeader (Progress & Metadata)
├── QuestionCard (Question Content)
├── Timer (Time Management)
├── NavigationControls (Navigation & Overview)
└── AssessmentResults (Results Display)
```

## Integration with React Components

These mocks directly correspond to the React components:
- `src/components/MCQScreen.tsx` → `mcq-screen-mock.html`
- `src/components/QuestionHeader.tsx` → `question-header-mock.html`
- `src/components/QuestionCard.tsx` → `question-card-mock.html`
- `src/components/NavigationControls.tsx` → `navigation-controls-mock.html`
- `src/components/Timer.tsx` → `timer-mock.html`
- Results view in MCQScreen → `assessment-results-mock.html`

## Maintenance Notes

- Keep mocks in sync with React component changes
- Update when design system colors or typography change
- Test mocks on different screen sizes and browsers
- Use for stakeholder reviews and design approvals

## Technical Details

- **Framework**: Pure HTML/CSS/JavaScript
- **Icons**: Google Material Icons
- **Fonts**: Google Fonts (Inter)
- **Responsive**: CSS Grid and Flexbox
- **Animations**: CSS transitions and keyframes
- **Interactive**: Vanilla JavaScript for demos