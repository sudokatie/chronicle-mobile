// Mock for isomorphic-git

export const clone = jest.fn().mockResolvedValue(undefined);
export const fetch = jest.fn().mockResolvedValue(undefined);
export const push = jest.fn().mockResolvedValue({ ok: true, refs: {} });
export const pull = jest.fn().mockResolvedValue({ success: true });
export const add = jest.fn().mockResolvedValue(undefined);
export const commit = jest.fn().mockResolvedValue('mocksha');
export const statusMatrix = jest.fn().mockResolvedValue([]);
export const currentBranch = jest.fn().mockResolvedValue('main');
export const resolveRef = jest.fn().mockResolvedValue('mocksha');
export const merge = jest.fn().mockResolvedValue(undefined);
export const checkout = jest.fn().mockResolvedValue(undefined);
export const init = jest.fn().mockResolvedValue(undefined);
export const addRemote = jest.fn().mockResolvedValue(undefined);
export const walk = jest.fn().mockResolvedValue([]);
export const TREE = jest.fn((opts) => opts);

export default {
  clone,
  fetch,
  push,
  pull,
  add,
  commit,
  statusMatrix,
  currentBranch,
  resolveRef,
  merge,
  checkout,
  init,
  addRemote,
  walk,
  TREE,
};
