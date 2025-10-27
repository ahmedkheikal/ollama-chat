// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // Use different port for tests

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
};
