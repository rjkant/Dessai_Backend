import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env' });

// Mock external services for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    ping: jest.fn(() => Promise.resolve('PONG')),
  })),
}));

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during testing unless LOG_LEVEL is debug
if (process.env['LOG_LEVEL'] !== 'debug') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
