# Coding Platform Interface - Technical Specifications

## Component API Reference

### EnhancedCodingPad Component

#### Props Interface
```typescript
interface EnhancedCodingPadProps {
  problemId?: string;
  initialCode?: string;
  language?: SupportedLanguage;
  theme?: 'light' | 'dark';
  onCodeChange?: (code: string) => void;
  onSubmit?: (code: string, language: string) => Promise<TestResult[]>;
  onRun?: (code: string, language: string) => Promise<ExecutionResult>;
  readOnly?: boolean;
  showTestResults?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}
```

#### State Management
```typescript
interface CodingPadState {
  currentCode: string;
  selectedLanguage: SupportedLanguage;
  theme: 'light' | 'dark';
  isRunning: boolean;
  isSubmitting: boolean;
  testResults: TestResult[];
  feedback: FeedbackMessage | null;
  lastSavedAt: Date | null;
}
```

#### Key Methods
```typescript
// Code management
const updateCode = (newCode: string) => void;
const saveCode = () => Promise<void>;
const clearCode = () => void;
const resetToTemplate = () => void;

// Execution
const runCode = () => Promise<ExecutionResult>;
const submitSolution = () => Promise<SubmissionResult>;

// Language handling
const changeLanguage = (language: SupportedLanguage) => void;
const getLanguageTemplate = (language: SupportedLanguage) => string;

// Theme management
const toggleTheme = () => void;
const setTheme = (theme: 'light' | 'dark') => void;
```

### ProblemSidebar Component

#### Props Interface
```typescript
interface ProblemSidebarProps {
  problems: Problem[];
  activeId: string | null;
  onProblemSelect: (problemId: string) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showDifficulty?: boolean;
  groupBy?: 'difficulty' | 'category' | 'none';
  sortBy?: 'title' | 'difficulty' | 'lastAttempted';
}
```

#### Problem Interface
```typescript
interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  testCases: TestCase[];
  constraints?: string[];
  examples?: Example[];
  hints?: string[];
  tags: string[];
  estimatedTime: number; // minutes
  lastAttempted?: Date;
  status: 'not-attempted' | 'attempted' | 'solved';
}
```

### ProblemDetail Component

#### Props Interface
```typescript
interface ProblemDetailProps {
  problem: Problem | null;
  showExamples?: boolean;
  showConstraints?: boolean;
  showHints?: boolean;
  expandableTestCases?: boolean;
  onHintRequest?: () => void;
}
```

## Data Models

### Test Case Structure
```typescript
interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isHidden?: boolean; // For final submission testing
  weight?: number; // For scoring
}
```

### Test Result Structure
```typescript
interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'error' | 'timeout';
  actualOutput?: string;
  executionTime?: number;
  memoryUsage?: number;
  error?: {
    message: string;
    stack?: string;
    line?: number;
    column?: number;
  };
}
```

### Language Configuration
```typescript
interface Language {
  id: SupportedLanguage;
  name: string;
  displayName: string;
  icon: string;
  template: string;
  extension: string;
  monacoLanguage: string;
  compilerVersion?: string;
  features: {
    autoComplete: boolean;
    syntaxHighlighting: boolean;
    errorDetection: boolean;
    formatting: boolean;
  };
}

type SupportedLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'java' 
  | 'cpp' 
  | 'csharp' 
  | 'go' 
  | 'rust';
```

## CSS Custom Properties

### Color System
```css
:root {
  /* Primary Colors */
  --primary-main: #1976d2;
  --primary-light: #42a5f5;
  --primary-dark: #1565c0;
  --primary-contrast: #ffffff;

  /* Secondary Colors */
  --secondary-main: #dc004e;
  --secondary-light: #f50057;
  --secondary-dark: #c51162;

  /* Status Colors */
  --success-main: #4caf50;
  --warning-main: #ff9800;
  --error-main: #f44336;
  --info-main: #2196f3;

  /* Neutral Colors */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --background-default: #fafafa;
  --background-paper: #ffffff;
  --divider: #e0e0e0;

  /* Difficulty Colors */
  --difficulty-easy: #4caf50;
  --difficulty-medium: #ff9800;
  --difficulty-hard: #f44336;

  /* Shadows */
  --shadow-1: 0 2px 4px rgba(0,0,0,0.04);
  --shadow-2: 0 4px 8px rgba(0,0,0,0.08);
  --shadow-3: 0 8px 16px rgba(0,0,0,0.12);

  /* Border Radius */
  --radius-small: 4px;
  --radius-medium: 8px;
  --radius-large: 12px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
  
  /* Font Sizes */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### Dark Theme Variables
```css
[data-theme="dark"] {
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --background-default: #121212;
  --background-paper: #1e1e1e;
  --divider: #333333;
  
  /* Editor specific */
  --editor-background: #1e1e1e;
  --editor-text: #d4d4d4;
  --editor-border: #404040;
}
```

## Responsive Breakpoints

### Breakpoint System
```css
/* Mobile First Approach */
:root {
  --breakpoint-xs: 0px;      /* Extra small devices */
  --breakpoint-sm: 600px;    /* Small devices */
  --breakpoint-md: 900px;    /* Medium devices */
  --breakpoint-lg: 1200px;   /* Large devices */
  --breakpoint-xl: 1536px;   /* Extra large devices */
}
```

### Layout Configurations
```css
/* Desktop Layout (1200px+) */
.main-container {
  display: grid;
  grid-template-columns: 300px 350px 1fr;
  grid-template-areas: "sidebar detail editor";
}

/* Tablet Layout (900px - 1199px) */
@media (max-width: 1199px) {
  .main-container {
    grid-template-columns: 280px 320px 1fr;
  }
}

/* Mobile Layout (< 900px) */
@media (max-width: 899px) {
  .main-container {
    display: flex;
    flex-direction: column;
  }
  
  .problem-sidebar,
  .problem-detail {
    max-height: 40vh;
    overflow-y: auto;
  }
}
```

## Accessibility Specifications

### Focus Management
```css
/* Focus Styles */
.focusable:focus {
  outline: 2px solid var(--primary-main);
  outline-offset: 2px;
  border-radius: var(--radius-medium);
}

/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--background-paper);
  color: var(--text-primary);
  padding: 8px;
  text-decoration: none;
  border-radius: var(--radius-medium);
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

### ARIA Patterns
```html
<!-- Problem List -->
<ul role="list" aria-label="Available problems">
  <li role="listitem">
    <button 
      role="button" 
      aria-current="page"
      aria-describedby="problem-1-difficulty"
    >
      <span>Two Sum</span>
      <span id="problem-1-difficulty" class="sr-only">Easy difficulty</span>
    </button>
  </li>
</ul>

<!-- Code Editor -->
<section role="region" aria-label="Code editor">
  <div role="toolbar" aria-label="Editor actions">
    <button aria-label="Run code" aria-keyshortcuts="Ctrl+Enter">
      Run Code
    </button>
  </div>
  <textarea 
    aria-label="Code input area"
    aria-describedby="editor-help"
    spellcheck="false"
  ></textarea>
  <div id="editor-help" class="sr-only">
    Use Ctrl+Enter to run code, Ctrl+S to save
  </div>
</section>

<!-- Test Results -->
<section role="region" aria-label="Test results">
  <div aria-live="polite" aria-atomic="true">
    Test results will be announced here
  </div>
</section>
```

## Performance Specifications

### Bundle Size Targets
- **Initial Bundle**: < 250KB gzipped
- **Code Editor Chunk**: < 500KB gzipped
- **Problem Data**: < 50KB per problem set

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Optimization Strategies
```typescript
// Code splitting
const MonacoEditor = lazy(() => import('./MonacoEditor'));

// Virtual scrolling for large lists
const VirtualizedProblemList = memo(({ problems }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={problems.length}
      itemSize={80}
      itemData={problems}
    >
      {ProblemListItem}
    </FixedSizeList>
  );
});

// Debounced search
const useDebounced = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
```

## Error Handling

### Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class CodingPadErrorBoundary extends Component<
  PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log to monitoring service
    console.error('CodingPad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <SimpleCodingPadFallback />;
    }

    return this.props.children;
  }
}
```

### Fallback Components
```typescript
const SimpleCodingPadFallback = () => (
  <div className="fallback-container">
    <h2>Code Editor Temporarily Unavailable</h2>
    <p>Please use the basic text editor below:</p>
    <textarea 
      className="fallback-editor"
      placeholder="Write your code here..."
      rows={20}
      cols={80}
    />
    <div className="fallback-actions">
      <button>Submit Code</button>
      <button>Copy Code</button>
    </div>
  </div>
);
```

## Security Considerations

### Input Sanitization
```typescript
// Code input sanitization
const sanitizeCode = (code: string): string => {
  // Remove potentially dangerous patterns
  return code
    .replace(/eval\s*\(/gi, '// eval removed //')
    .replace(/Function\s*\(/gi, '// Function constructor removed //')
    .replace(/setTimeout\s*\(/gi, '// setTimeout removed //');
};

// XSS Prevention
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
```

### Content Security Policy
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.dessai.com;
  worker-src 'self' blob:;
```

---

## Testing Specifications

### Unit Test Coverage
- **Components**: 90%+ coverage
- **Utilities**: 100% coverage
- **Business Logic**: 95%+ coverage

### E2E Test Scenarios
1. **Problem Selection**: Navigate through problem list
2. **Code Editing**: Write and modify code
3. **Language Switching**: Change programming languages
4. **Code Execution**: Run code and view results
5. **Submission**: Submit solution and receive feedback
6. **Accessibility**: Screen reader navigation

### Performance Tests
```typescript
describe('Performance Tests', () => {
  test('Large problem list renders within 500ms', async () => {
    const startTime = performance.now();
    render(<ProblemSidebar problems={largeProblemSet} />);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(500);
  });

  test('Code editor handles large files efficiently', async () => {
    const largeCode = 'x'.repeat(100000);
    const { getByRole } = render(<EnhancedCodingPad />);
    const editor = getByRole('textbox');
    
    const startTime = performance.now();
    fireEvent.change(editor, { target: { value: largeCode } });
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

---

*This technical specification serves as the definitive reference for implementing and maintaining the Dessai Coding Platform interface components.*
