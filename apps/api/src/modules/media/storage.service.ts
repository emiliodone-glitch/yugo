import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * S3-compatible storage adapter (MinIO locally, R2/S3 in production) with
 * signed URLs — photos are never public (RNF-04).
 */
@Injectable()
export class StorageService {
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: !!process.env.S3_ENDPOINT, // MinIO needs path-style
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'yugo',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'yugo-secret',
    },
  });
  private readonly bucket = process.env.S3_BUCKET ?? 'yugo-media';
  private readonly ttl = Number(process.env.S3_SIGNED_URL_TTL ?? 900);

  /** Presigned PUT for direct client upload. */
  async signUpload(prefix: string, contentType: string) {
    const key = `${prefix}/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: this.ttl });
    return { key, uploadUrl };
  }

  /** Presigned GET with expiry. */
  async signDownload(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: this.ttl });
  }
}
