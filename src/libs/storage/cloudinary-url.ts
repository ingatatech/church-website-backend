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
    cloudName = cloudinaryUrl ? new URL(cloudinaryUrl).hostname : '';
  } catch {
    return false;
  }

  const path = image.pathname.split('/');
  const sharedCdn =
    image.hostname === 'res.cloudinary.com' &&
    path[2] === 'image' &&
    path[3] === 'upload' &&
    (!cloudName || path[1] === cloudName);
  const privateCdn =
    Boolean(cloudName) &&
    image.hostname === `${cloudName}-res.cloudinary.com` &&
    path[1] === 'image' &&
    path[2] === 'upload';
  const configuredCustomCdn =
    Boolean(customDeliveryHost) &&
    image.hostname === customDeliveryHost?.trim().toLowerCase() &&
    image.pathname.length > 1;

  return sharedCdn || privateCdn || configuredCustomCdn;
}
