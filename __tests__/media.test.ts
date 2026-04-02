import { attachmentToMarkdown, getThumbnailUri } from '../src/services/media';
import { Attachment } from '../src/types';

describe('Media Service', () => {
  describe('attachmentToMarkdown', () => {
    it('generates markdown for image attachments', () => {
      const attachment: Attachment = {
        id: 'test-1',
        type: 'image',
        uri: 'file://vault/attachments/image.jpg',
        filename: 'image.jpg',
        mimeType: 'image/jpeg',
        width: 100,
        height: 100,
      };

      expect(attachmentToMarkdown(attachment)).toBe('![image.jpg](attachments/image.jpg)');
    });

    it('generates markdown for audio attachments', () => {
      const attachment: Attachment = {
        id: 'test-2',
        type: 'audio',
        uri: 'file://vault/attachments/recording.m4a',
        filename: 'recording.m4a',
        mimeType: 'audio/m4a',
        duration: 30,
      };

      expect(attachmentToMarkdown(attachment)).toBe('[recording.m4a](attachments/recording.m4a)');
    });

    it('generates markdown for generic file attachments', () => {
      const attachment: Attachment = {
        id: 'test-3',
        type: 'file',
        uri: 'file://vault/attachments/document.pdf',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
      };

      expect(attachmentToMarkdown(attachment)).toBe('[document.pdf](attachments/document.pdf)');
    });
  });

  describe('getThumbnailUri', () => {
    it('returns the attachment URI', () => {
      const attachment: Attachment = {
        id: 'test-1',
        type: 'image',
        uri: 'file://vault/attachments/image.jpg',
        filename: 'image.jpg',
        mimeType: 'image/jpeg',
      };

      expect(getThumbnailUri(attachment)).toBe('file://vault/attachments/image.jpg');
    });
  });
});
