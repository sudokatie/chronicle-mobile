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

// Animated mock
class AnimatedValue {
  _value: number;
  constructor(value: number) {
    this._value = value;
  }
  setValue(value: number) { this._value = value; }
  setOffset(offset: number) {}
  flattenOffset() {}
  extractOffset() {}
  addListener(callback: (state: { value: number }) => void) { return ''; }
  removeListener(id: string) {}
  removeAllListeners() {}
  stopAnimation(callback?: (value: number) => void) { callback?.(this._value); }
  resetAnimation(callback?: (value: number) => void) { callback?.(this._value); }
  interpolate(config: any) { return this; }
}

export const Animated = {
  Value: AnimatedValue,
  ValueXY: class {
    x = new AnimatedValue(0);
    y = new AnimatedValue(0);
    constructor(config?: { x?: number; y?: number }) {
      if (config?.x) this.x = new AnimatedValue(config.x);
      if (config?.y) this.y = new AnimatedValue(config.y);
    }
    setValue(value: { x: number; y: number }) {}
    setOffset(offset: { x: number; y: number }) {}
    flattenOffset() {}
    extractOffset() {}
    getLayout() { return {}; }
    getTranslateTransform() { return []; }
  },
  timing: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  spring: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  decay: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  sequence: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  parallel: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  stagger: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })) })),
  loop: jest.fn(() => ({ start: jest.fn((cb?: any) => cb?.({ finished: true })), stop: jest.fn() })),
  event: jest.fn(() => jest.fn()),
  add: jest.fn(() => new AnimatedValue(0)),
  subtract: jest.fn(() => new AnimatedValue(0)),
  multiply: jest.fn(() => new AnimatedValue(0)),
  divide: jest.fn(() => new AnimatedValue(0)),
  modulo: jest.fn(() => new AnimatedValue(0)),
  diffClamp: jest.fn(() => new AnimatedValue(0)),
  createAnimatedComponent: jest.fn((component: any) => component),
  View: 'Animated.View',
  Text: 'Animated.Text',
  Image: 'Animated.Image',
  ScrollView: 'Animated.ScrollView',
  FlatList: 'Animated.FlatList',
};

// PanResponder mock
export const PanResponder = {
  create: jest.fn((config) => ({
    panHandlers: {
      onStartShouldSetResponder: jest.fn(),
      onMoveShouldSetResponder: jest.fn(),
      onResponderGrant: jest.fn(),
      onResponderMove: jest.fn(),
      onResponderRelease: jest.fn(),
      onResponderTerminate: jest.fn(),
      onStartShouldSetResponderCapture: jest.fn(),
      onMoveShouldSetResponderCapture: jest.fn(),
    },
  })),
};

// useColorScheme hook
export const useColorScheme = jest.fn(() => 'light');

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
  Animated,
  PanResponder,
  useColorScheme,
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
