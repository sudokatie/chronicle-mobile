// Jest setup file for Chronicle Mobile tests
// Module mocks are in __mocks__ directory and configured via moduleNameMapper

// Global test utilities
global.testUtils = {
  flushPromises: () => new Promise(setImmediate),
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Type declarations for global test utilities
declare global {
  var testUtils: {
    flushPromises: () => Promise<void>;
    wait: (ms: number) => Promise<void>;
  };
}

export {};
