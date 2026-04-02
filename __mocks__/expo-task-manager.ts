// Mock for expo-task-manager

export const defineTask = jest.fn();
export const isTaskDefined = jest.fn().mockResolvedValue(false);
export const isTaskRegisteredAsync = jest.fn().mockResolvedValue(false);
export const unregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
export const unregisterAllTasksAsync = jest.fn().mockResolvedValue(undefined);

export default {
  defineTask,
  isTaskDefined,
  isTaskRegisteredAsync,
  unregisterTaskAsync,
  unregisterAllTasksAsync,
};
