// Mock for react-native

export const Platform = {
  OS: 'ios',
  select: jest.fn((obj: Record<string, unknown>) => obj.ios ?? obj.default),
  Version: '14.0',
};

export const StyleSheet = {
  create: jest.fn((styles: Record<string, unknown>) => styles),
  flatten: jest.fn((style: unknown) => style),
  absoluteFill: {},
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth: 1,
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

export const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const NativeModules = {};

export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const ScrollView = 'ScrollView';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const TouchableHighlight = 'TouchableHighlight';
export const TouchableWithoutFeedback = 'TouchableWithoutFeedback';
export const FlatList = 'FlatList';
export const SectionList = 'SectionList';
export const ActivityIndicator = 'ActivityIndicator';
export const Modal = 'Modal';
export const SafeAreaView = 'SafeAreaView';
export const StatusBar = 'StatusBar';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const Pressable = 'Pressable';
export const RefreshControl = 'RefreshControl';

export default {
  Platform,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  AppState,
  NativeModules,
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  FlatList,
  SectionList,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
};
