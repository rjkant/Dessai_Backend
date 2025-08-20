// Direct service testing - bypassing HTTP layer
import { CodeExecutionService } from './src/services/execution.service';
import { ProgrammingLanguage } from './src/types/execution.types';

console.log('🧪 Testing Code Execution Service directly...\n');

async function testExecutionService() {
  try {
    // Create service instance
    const executionService = new CodeExecutionService();
    
    console.log('✅ ExecutionService instance created successfully');
    
    // Test simple JavaScript execution
    console.log('\n🔍 Testing JavaScript execution...');
    const jsResult = await executionService.executeCode({
      sessionId: 'test-session-1',
      questionId: 'test-question-1',
      code: 'console.log("Hello from JavaScript!"); return 42;',
      language: ProgrammingLanguage.JAVASCRIPT,
      timeLimit: 5000
    });
    
    console.log('✅ JavaScript execution result:', jsResult);
    
    // Test Python execution
    console.log('\n🔍 Testing Python execution...');
    const pythonResult = await executionService.executeCode({
      sessionId: 'test-session-2',
      questionId: 'test-question-2',
      code: 'print("Hello from Python!")\nresult = 2 + 2\nprint(f"2 + 2 = {result}")',
      language: ProgrammingLanguage.PYTHON,
      timeLimit: 5000
    });
    
    console.log('✅ Python execution result:', pythonResult);
    
    console.log('\n🎉 All direct service tests passed!');
    
  } catch (error) {
    console.error('❌ Direct service test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  }
}

// Run the test
testExecutionService().then(() => {
  console.log('\n✨ Direct service testing completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Test runner failed:', error);
  process.exit(1);
});
