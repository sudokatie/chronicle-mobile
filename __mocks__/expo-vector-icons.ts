// Mock for @expo/vector-icons
import React from 'react';

const createMockIcon = (name: string) => {
  const MockIcon = ({ name: iconName, size, color, style }: any) => {
    return React.createElement('Text', { style }, iconName || name);
  };
  MockIcon.displayName = name;
  return MockIcon;
};

export const Ionicons = createMockIcon('Ionicons');
export const MaterialIcons = createMockIcon('MaterialIcons');
export const FontAwesome = createMockIcon('FontAwesome');
export const AntDesign = createMockIcon('AntDesign');
export const Entypo = createMockIcon('Entypo');
export const EvilIcons = createMockIcon('EvilIcons');
export const Feather = createMockIcon('Feather');
export const FontAwesome5 = createMockIcon('FontAwesome5');
export const Fontisto = createMockIcon('Fontisto');
export const Foundation = createMockIcon('Foundation');
export const MaterialCommunityIcons = createMockIcon('MaterialCommunityIcons');
export const Octicons = createMockIcon('Octicons');
export const SimpleLineIcons = createMockIcon('SimpleLineIcons');
export const Zocial = createMockIcon('Zocial');
