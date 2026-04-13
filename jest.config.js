module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo|@expo|expo-.*|react-native|@react-native|@react-native-community)/)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.ts',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.ts',
    '^expo-local-authentication$': '<rootDir>/__mocks__/expo-local-authentication.ts',
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.ts',
    '^isomorphic-git$': '<rootDir>/__mocks__/isomorphic-git.ts',
    '^isomorphic-git/http/web$': '<rootDir>/__mocks__/isomorphic-git-http.ts',
    '^expo-task-manager$': '<rootDir>/__mocks__/expo-task-manager.ts',
    '^expo-background-fetch$': '<rootDir>/__mocks__/expo-background-fetch.ts',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/netinfo.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    '^expo-av$': '<rootDir>/__mocks__/expo-av.ts',
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.ts',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/expo-vector-icons.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  clearMocks: true,
  verbose: true,
  testTimeout: 10000,
  maxWorkers: 2,
};
