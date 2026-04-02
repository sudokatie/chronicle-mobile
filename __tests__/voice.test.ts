import { formatDuration } from '../src/services/voice';

describe('Voice Service', () => {
  describe('formatDuration', () => {
    it('formats 0 seconds correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('formats seconds under a minute', () => {
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(59)).toBe('00:59');
    });

    it('formats minutes correctly', () => {
      expect(formatDuration(60)).toBe('01:00');
      expect(formatDuration(90)).toBe('01:30');
      expect(formatDuration(125)).toBe('02:05');
    });

    it('formats longer durations', () => {
      expect(formatDuration(600)).toBe('10:00');
      expect(formatDuration(3599)).toBe('59:59');
      expect(formatDuration(3600)).toBe('60:00');
    });
  });
});
