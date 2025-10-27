# Backend Test Suite

This directory contains comprehensive unit and integration tests for the backend application.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── chatHistory.test.js  # ChatHistory domain class tests
│   ├── ollamaClient.test.js # OllamaClient infrastructure tests
│   └── chatService.test.js  # ChatService application layer tests
├── integration/            # Integration tests
│   └── server.test.js      # Server route tests
├── setup.js                # Test setup configuration
└── README.md               # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The test suite provides comprehensive coverage for:

### Unit Tests
- **ChatHistory**: Message storage, retrieval, and management
- **OllamaClient**: AI model communication and message formatting
- **ChatService**: Business logic and message processing

### Integration Tests
- **Server Routes**: API endpoints and SSE streaming
- **Error Handling**: Graceful error responses
- **CORS**: Cross-origin request handling

## Test Features

- ✅ **ES Module Support**: Configured for modern JavaScript
- ✅ **Mocking**: Comprehensive mocking of external dependencies
- ✅ **Coverage Reports**: Detailed coverage analysis
- ✅ **Async Testing**: Full support for async/await patterns
- ✅ **SSE Testing**: Server-sent events testing

## Dependencies

- **Jest**: Testing framework
- **Supertest**: HTTP assertion library
- **Babel**: ES module transformation
- **@jest/globals**: Jest global functions

## Configuration

Tests are configured via `jest.config.js` with:
- Node.js test environment
- Babel transformation for ES modules
- Coverage collection and reporting
- Custom module name mapping
