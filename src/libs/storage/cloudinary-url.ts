export function isCloudinaryImageUrl(
  value: string,
  cloudinaryUrl?: string,
  customDeliveryHost?: string,
) {
  let image: URL;
  try {
    image = new URL(value);
  } catch {
    return false;
  }
  if (image.protocol !== 'https:' || image.username || image.password) return false;

  let cloudName = '';
  try {
    const rawUrl = cloudinaryUrl ? cloudinaryUrl.trim().replace(/^CLOUDINARY_URL=\s*/i, '').replace(/^[\"']|[\"']$/g, '').trim() : '';
    cloudName = rawUrl ? new URL(rawUrl).hostname.toLowerCase() : '';
  } catch {
    cloudName = '';
  }

  const hostname = image.hostname.toLowerCase();
  const path = image.pathname.split('/');
  const isCloudinaryHost =
    hostname === 'res.cloudinary.com' ||
    /^res(-\d+)?\.cloudinary\.com$/.test(hostname) ||
    hostname.endsWith('.cloudinary.com');

  const sharedCdn =
    isCloudinaryHost &&
    path.length >= 4 &&
    path.includes('upload') &&
    (!cloudName || path[1].toLowerCase() === cloudName);

  const privateCdn =
    Boolean(cloudName) &&
    hostname === `${cloudName}-res.cloudinary.com` &&
    path.length >= 3 &&
    path.includes('upload');

  const configuredCustomCdn =
    Boolean(customDeliveryHost) &&
    hostname === customDeliveryHost?.trim().toLowerCase() &&
    image.pathname.length > 1;

  return sharedCdn || privateCdn || configuredCustomCdn;
}

export function extractCloudinaryPublicId(
  urlOrPublicId: string,
): { publicId: string; resourceType: 'image' | 'video' | 'raw' } | null {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return null;
  const trimmed = urlOrPublicId.trim();
  if (!trimmed) return null;

  // If already a public ID (e.g., "church-website/abc123xyz")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { publicId: trimmed, resourceType: 'image' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (
    !parsed.hostname.includes('cloudinary.com') &&
    !parsed.hostname.includes('res.cloudinary.com')
  ) {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const uploadIndex = segments.indexOf('upload');
  if (uploadIndex === -1) return null;

  const prevSegment = segments[uploadIndex - 1];
  const resourceType =
    prevSegment === 'video' || prevSegment === 'raw' ? prevSegment : 'image';

  const afterUpload = segments.slice(uploadIndex + 1);
  if (afterUpload.length === 0) return null;

  let startIndex = 0;
  while (startIndex < afterUpload.length) {
    const seg = afterUpload[startIndex];
    if (/^v\d+$/.test(seg)) {
      startIndex++;
      break;
    }
    if (seg.includes(',') || /^[a-z]_[a-z0-9_,-]+$/i.test(seg)) {
      startIndex++;
      continue;
    }
    break;
  }

  const publicIdSegments = afterUpload.slice(startIndex);
  if (publicIdSegments.length === 0) return null;

  const lastIndex = publicIdSegments.length - 1;
  const lastSegment = publicIdSegments[lastIndex];
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex > 0) {
    publicIdSegments[lastIndex] = lastSegment.slice(0, dotIndex);
  }

  const publicId = publicIdSegments.join('/');
  return { publicId, resourceType };
}
