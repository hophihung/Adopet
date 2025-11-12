// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ActivityIndicator
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ testID, ...props }) => {
      const { View } = require('react-native');
      return React.createElement(View, { testID: testID || 'activity-indicator', ...props });
    },
  };
});
