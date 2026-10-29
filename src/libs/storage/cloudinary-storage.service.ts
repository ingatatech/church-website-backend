import {
  ConflictException,
  BadRequestException,
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContentRecord } from '../../app/modules/content/content.entity';
import { ChurchEvent } from '../../app/modules/events/entities/church-event.entity';
import { Ministry } from '../../app/modules/ministries/entities/ministry.entity';
import { Sermon } from '../../app/modules/sermons/entities/sermon.entity';
import { Speaker } from '../../app/modules/sermons/entities/speaker.entity';
import { MediaAsset } from './entities/media-asset.entity';

type CloudinaryResource = {
  public_id?: string;
  secure_url?: string;
  bytes?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
  folder?: string;
  asset_folder?: string;
  width?: number;
  height?: number;
};

const MEDIA_FOLDERS: Record<string, string> = {
  image: 'images',
  branding: 'branding',
  homepage: 'homepage',
  ministries: 'ministries',
  leadership: 'leadership',
  sermons: 'sermons',
  events: 'events',
  announcements: 'announcements',
  resources: 'resources',
  general: 'general',
};

@Injectable()
export class CloudinaryStorageService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(MediaAsset)
    private readonly assets: Repository<MediaAsset>,
    @InjectRepository(ContentRecord)
    private readonly content: Repository<ContentRecord>,
    @InjectRepository(ChurchEvent)
    private readonly events: Repository<ChurchEvent>,
    @InjectRepository(Sermon)
    private readonly sermons: Repository<Sermon>,
    @InjectRepository(Ministry)
    private readonly ministries: Repository<Ministry>,
    @InjectRepository(Speaker)
    private readonly speakers: Repository<Speaker>,
  ) {}

  async upload(file: Express.Multer.File, purpose = 'general') {
    const folderName = MEDIA_FOLDERS[purpose];
    if (!folderName) throw new BadRequestException('Choose a valid media folder.');

    const resourceType = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')
        ? 'video'
        : 'raw';
    const folder = `church-website/${folderName}`;
    const { cloudName, authorization } = this.credentials();

    try {
      const form = new FormData();
      form.append(
        'file',
        new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
      form.append('folder', folder);
      form.append('public_id', `${this.safeFileName(file.originalname)}-${crypto.randomUUID()}`);
      form.append('overwrite', 'false');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
        { method: 'POST', headers: { Authorization: authorization }, body: form },
      );
      const result = (await response.json().catch(() => null)) as
        | CloudinaryResource
        | null;

      if (!response.ok || !result?.secure_url || !result.public_id) {
        throw new BadGatewayException(
          'Cloudinary could not store this file. Please try again.',
        );
      }

      try {
        const asset = await this.assets.save(
          this.assets.create(this.toEntity(result, folder, file.size, file.mimetype)),
        );
        return {
          ...this.publicAsset(asset),
          filename: asset.publicId,
          mimeType: file.mimetype,
          size: Number(asset.bytes),
          url: asset.secureUrl,
        };
      } catch {
        await this.destroy(result.public_id, result.resource_type ?? resourceType).catch(
          () => undefined,
        );
        throw new ServiceUnavailableException(
          'The file was uploaded but its media record could not be saved. Please retry.',
        );
      }
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }
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
          response = await fetch(url, { headers: { Authorization: authorization } });
        } catch {
          throw new ServiceUnavailableException(
            'Could not connect to Cloudinary. Please try again.',
          );
        }
        const result = (await response.json().catch(() => null)) as
          | { resources?: CloudinaryResource[] }
          | null;
        if (!response.ok || !result?.resources) {
          throw new ServiceUnavailableException(
            'Could not load the Cloudinary media library.',
          );
        }
        return result.resources;
      }),
    );

    const remoteAssets = lists.flat().filter(
      (item): item is CloudinaryResource & { public_id: string; secure_url: string } =>
        Boolean(item.public_id && item.secure_url),
    );
    const persistedByKey = new Map<string, MediaAsset>();
    await Promise.all(
      resourceTypes.map(async (resourceType) => {
        const ids = remoteAssets
          .filter((item) => item.resource_type === resourceType)
          .map((item) => item.public_id);
        if (!ids.length) return;
        const existing = await this.assets.find({
          where: { resourceType, publicId: In(ids) },
        });
        for (const asset of existing) {
          persistedByKey.set(`${asset.resourceType}:${asset.publicId}`, asset);
        }
      }),
    );

    const entities = remoteAssets.map((item) => {
      const resourceType = item.resource_type ?? 'image';
      const previous = persistedByKey.get(`${resourceType}:${item.public_id}`);
      return this.assets.create({
        ...this.toEntity(item, item.asset_folder ?? item.folder ?? 'church-website', item.bytes ?? 0),
        id: previous?.id,
        altText: previous?.altText ?? '',
      });
    });
    const saved = entities.length ? await this.assets.save(entities) : [];
    return saved
      .sort((left, right) =>
        (right.cloudinaryCreatedAt?.getTime() ?? 0) -
        (left.cloudinaryCreatedAt?.getTime() ?? 0),
      )
      .slice(0, 100)
      .map((asset) => this.publicAsset(asset));
  }

  async updateAltText(id: string, altText: string) {
    if (typeof altText !== 'string' || altText.length > 500) {
      throw new BadRequestException('Alternative text must be 500 characters or fewer.');
    }
    const asset = await this.assets.findOneBy({ id });
    if (!asset) throw new NotFoundException('Media asset was not found.');
    asset.altText = altText.trim();
    return this.publicAsset(await this.assets.save(asset));
  }

  async deleteAsset(id: string) {
    const asset = await this.assets.findOneBy({ id });
    if (!asset) throw new NotFoundException('Media asset was not found.');
    if (await this.isReferenced(asset)) {
      throw new ConflictException(
        'This media is used by website content. Replace or remove those references before deleting it.',
      );
    }

    const result = await this.destroy(asset.publicId, asset.resourceType);
    if (!result) {
      throw new ServiceUnavailableException(
        'Cloudinary did not confirm deletion. The media record was kept.',
      );
    }
    await this.assets.remove(asset);
    return { id: asset.id, deleted: true };
  }

  /** Best-effort cleanup for legacy call sites; referenced or unindexed assets stay intact. */
  async deleteFile(urlOrPublicId: string): Promise<boolean> {
    const asset = await this.assets.findOne({
      where: [
        { secureUrl: urlOrPublicId },
        { publicId: urlOrPublicId, resourceType: 'image' },
        { publicId: urlOrPublicId, resourceType: 'video' },
        { publicId: urlOrPublicId, resourceType: 'raw' },
      ],
    });
    if (!asset || (await this.isReferenced(asset))) return false;
    const deleted = await this.destroy(asset.publicId, asset.resourceType);
    if (deleted) await this.assets.remove(asset);
    return deleted;
  }

  private async isReferenced(asset: MediaAsset) {
    const values = await Promise.all([
      this.content.find(),
      this.events.find(),
      this.sermons.find(),
      this.ministries.find(),
      this.speakers.find(),
    ]);
    const marker = asset.publicId;
    const url = asset.secureUrl;
    return values.some((records) =>
      records.some((record) => {
        const serialized = JSON.stringify(record);
        return serialized.includes(marker) || serialized.includes(url);
      }),
    );
  }

  private toEntity(
    item: CloudinaryResource,
    folder: string,
    originalSize: number,
    mimeType?: string,
  ) {
    const cloudinaryDate = item.created_at ? new Date(item.created_at) : null;
    return {
      publicId: item.public_id!,
      secureUrl: item.secure_url!,
      resourceType: item.resource_type ?? this.typeFromMime(mimeType),
      format: item.format ?? null,
      width: Number.isInteger(item.width) ? item.width! : null,
      height: Number.isInteger(item.height) ? item.height! : null,
      bytes: String(item.bytes ?? originalSize),
      folder: item.asset_folder ?? item.folder ?? folder,
      cloudinaryCreatedAt:
        cloudinaryDate && !Number.isNaN(cloudinaryDate.getTime())
          ? cloudinaryDate
          : null,
    };
  }

  private publicAsset(asset: MediaAsset) {
    return {
      id: asset.id,
      publicId: asset.publicId,
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      altText: asset.altText,
      folder: asset.folder,
      createdAt: (asset.cloudinaryCreatedAt ?? asset.createdAt).toISOString(),
    };
  }

  private async destroy(publicId: string, resourceType: string) {
    if (!['image', 'video', 'raw'].includes(resourceType)) return false;
    const { cloudName, authorization } = this.credentials();
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/destroy`,
        {
          method: 'POST',
          headers: { Authorization: authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: publicId }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { result?: string }
        | null;
      return response.ok && (result?.result === 'ok' || result?.result === 'not found');
    } catch {
      return false;
    }
  }

  private typeFromMime(mimeType?: string) {
    return mimeType?.startsWith('image/')
      ? 'image'
      : mimeType?.startsWith('audio/') || mimeType?.startsWith('video/')
        ? 'video'
        : 'raw';
  }

  private safeFileName(fileName: string) {
    const name = fileName
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 64);
    return name || 'upload';
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
