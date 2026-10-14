import {
  Injectable,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CloudinaryUploadResult = {
  public_id?: string;
  secure_url?: string;
  bytes?: number;
  format?: string;
  resource_type?: string;
};
type CloudinaryResource = {
  public_id?: string;
  secure_url?: string;
  bytes?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
};

@Injectable()
export class CloudinaryStorageService {
  constructor(private readonly config: ConfigService) {}

  async upload(file: Express.Multer.File) {
    const resourceType = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')
        ? 'video'
        : 'raw';

    const { cloudName, authorization } = this.credentials();
    try {
      const form = new FormData();
      form.append(
        'file',
        new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
      form.append('folder', 'church-website');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
        {
          method: 'POST',
          headers: { Authorization: authorization },
          body: form,
        },
      );

      const result = (await response
        .json()
        .catch(() => null)) as CloudinaryUploadResult | null;
      if (response.ok && result?.secure_url && result.public_id) {
        return {
          filename: result.public_id,
          publicId: result.public_id,
          mimeType: file.mimetype,
          size: result.bytes ?? file.size,
          format: result.format,
          resourceType: result.resource_type ?? resourceType,
          url: result.secure_url,
        };
      }
      throw new BadGatewayException(
        'Cloudinary could not store this file. Please try again.',
      );
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new ServiceUnavailableException(
        'Could not connect to Cloudinary. Please try again.',
      );
    }
  }

  async listRecent() {
    const { cloudName, authorization } = this.credentials();
    const resourceTypes = ['image', 'video', 'raw'] as const;
    const lists = await Promise.all(
      resourceTypes.map(async (resourceType) => {
        const url = new URL(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/${resourceType}/upload`,
        );
        url.searchParams.set('prefix', 'church-website/');
        url.searchParams.set('max_results', '100');
        let response: Response;
        try {
          response = await fetch(url, {
            headers: { Authorization: authorization },
          });
        } catch {
          throw new ServiceUnavailableException(
            'Could not connect to Cloudinary. Please try again.',
          );
        }
        const result = (await response.json().catch(() => null)) as {
          resources?: CloudinaryResource[];
        } | null;
        if (!response.ok || !result?.resources) {
          throw new ServiceUnavailableException(
            'Could not load the Cloudinary media library.',
          );
        }
        return result.resources;
      }),
    );

    return lists
      .flat()
      .sort((left, right) =>
        (right.created_at ?? '').localeCompare(left.created_at ?? ''),
      )
      .slice(0, 100);
  }

  private credentials() {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      throw new ServiceUnavailableException(
        'Cloudinary media storage is not configured.',
      );
    }

    try {
      const credentials = new URL(cloudinaryUrl);
      if (credentials.protocol !== 'cloudinary:') throw new Error();
      const cloudName = credentials.hostname;
      const apiKey = decodeURIComponent(credentials.username);
      const apiSecret = decodeURIComponent(credentials.password);
      if (!cloudName || !apiKey || !apiSecret) throw new Error();
      return {
        cloudName,
        authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      };
    } catch {
      throw new ServiceUnavailableException(
        'Cloudinary media storage configuration is invalid.',
      );
    }
  }
}
