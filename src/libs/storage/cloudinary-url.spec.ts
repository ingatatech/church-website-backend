import {
  isCloudinaryImageUrl,
  extractCloudinaryPublicId,
} from './cloudinary-url';

describe('cloudinary-url utilities', () => {
  describe('isCloudinaryImageUrl', () => {
    const validCloudinaryUrl = 'cloudinary://123456:abcdef@mycloud';

    it('returns false for invalid or non-https URLs', () => {
      expect(isCloudinaryImageUrl('')).toBe(false);
      expect(isCloudinaryImageUrl('not-a-url')).toBe(false);
      expect(
        isCloudinaryImageUrl(
          'http://res.cloudinary.com/mycloud/image/upload/v1/sample.jpg',
        ),
      ).toBe(false);
      expect(
        isCloudinaryImageUrl(
          'https://user:pass@res.cloudinary.com/mycloud/image/upload/v1/sample.jpg',
        ),
      ).toBe(false);
    });

    it('returns true for standard res.cloudinary.com image upload URLs', () => {
      expect(
        isCloudinaryImageUrl(
          'https://res.cloudinary.com/mycloud/image/upload/v123456/church-website/hero.jpg',
          validCloudinaryUrl,
        ),
      ).toBe(true);

      expect(
        isCloudinaryImageUrl(
          'https://res-1.cloudinary.com/mycloud/image/upload/v123456/church-website/hero.jpg',
          validCloudinaryUrl,
        ),
      ).toBe(true);
    });

    it('rejects URLs where cloud name does not match configuration', () => {
      expect(
        isCloudinaryImageUrl(
          'https://res.cloudinary.com/othercloud/image/upload/v123456/church-website/hero.jpg',
          validCloudinaryUrl,
        ),
      ).toBe(false);
    });

    it('accepts valid private CDN URLs', () => {
      expect(
        isCloudinaryImageUrl(
          'https://mycloud-res.cloudinary.com/image/upload/v123456/church-website/hero.jpg',
          validCloudinaryUrl,
        ),
      ).toBe(true);
    });

    it('accepts configured custom delivery hosts', () => {
      expect(
        isCloudinaryImageUrl(
          'https://media.mychurch.org/church-website/hero.jpg',
          validCloudinaryUrl,
          'media.mychurch.org',
        ),
      ).toBe(true);
    });

    it('rejects non-cloudinary hosts when custom host does not match', () => {
      expect(
        isCloudinaryImageUrl(
          'https://attacker.com/church-website/hero.jpg',
          validCloudinaryUrl,
          'media.mychurch.org',
        ),
      ).toBe(false);
    });
  });

  describe('extractCloudinaryPublicId', () => {
    it('returns publicId directly if not a URL', () => {
      expect(extractCloudinaryPublicId('church-website/my-photo')).toEqual({
        publicId: 'church-website/my-photo',
        resourceType: 'image',
      });
    });

    it('extracts publicId from standard Cloudinary image URL', () => {
      const url =
        'https://res.cloudinary.com/mycloud/image/upload/v1700000000/church-website/banner.jpg';
      expect(extractCloudinaryPublicId(url)).toEqual({
        publicId: 'church-website/banner',
        resourceType: 'image',
      });
    });

    it('extracts publicId from video URL with correct resourceType', () => {
      const url =
        'https://res.cloudinary.com/mycloud/video/upload/v1700000000/church-website/sermons/intro.mp4';
      expect(extractCloudinaryPublicId(url)).toEqual({
        publicId: 'church-website/sermons/intro',
        resourceType: 'video',
      });
    });

    it('handles transformation segments before the public ID', () => {
      const url =
        'https://res.cloudinary.com/mycloud/image/upload/c_fill,w_800,h_600/v1700000000/church-website/events/easter.png';
      expect(extractCloudinaryPublicId(url)).toEqual({
        publicId: 'church-website/events/easter',
        resourceType: 'image',
      });
    });

    it('returns null for empty, invalid, or non-Cloudinary URLs', () => {
      expect(extractCloudinaryPublicId('')).toBeNull();
      expect(extractCloudinaryPublicId('https://google.com/test.jpg')).toBeNull();
      expect(
        extractCloudinaryPublicId('https://res.cloudinary.com/mycloud/nothing-here'),
      ).toBeNull();
    });
  });
});
