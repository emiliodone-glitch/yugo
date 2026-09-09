import { CompareFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';

/**
 * Face comparison behind the identity verification flow (RF-VER-01). Every
 * implementation receives the storage keys of the selfie and the main photo
 * and answers with a similarity between 0 and 1.
 */
export interface FaceComparator {
  compare(selfieKey: string, photoKey: string): Promise<number>; // similarity 0..1
}

/** Similarity at or above this, with liveness passed, resolves automatically. */
export const AUTO_APPROVE_SIMILARITY = 0.93;

type Env = Record<string, string | undefined>;

/**
 * Whether a selfie resolves without a person looking at it. An unknown
 * similarity — no main photo, or the vendor failed — is never a pass.
 */
export function shouldAutoApprove(
  livenessPassed: boolean,
  similarity: number | null,
  threshold: number = AUTO_APPROVE_SIMILARITY,
): boolean {
  return livenessPassed && similarity !== null && similarity >= threshold;
}

/**
 * Auto-approval threshold from FACE_MATCH_AUTO_APPROVE. Only a number in
 * (0, 1] is accepted: anything else (empty, not a number, out of range, or a
 * zero that would approve every selfie) falls back to the default.
 */
export function resolveAutoApproveThreshold(env: Env = process.env): number {
  const raw = env.FACE_MATCH_AUTO_APPROVE?.trim();
  if (!raw) return AUTO_APPROVE_SIMILARITY;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 1) return AUTO_APPROVE_SIMILARITY;
  return value;
}

/**
 * Generic HTTP vendor behind FACE_MATCH_URL. Receives the two storage keys
 * and answers with `{ similarity }` between 0 and 1.
 */
export class ExternalFaceComparator implements FaceComparator {
  constructor(
    private readonly url: string,
    private readonly apiKey?: string,
  ) {}

  async compare(selfieKey: string, photoKey: string): Promise<number> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ selfieKey, photoKey }),
    });
    if (!response.ok) throw new Error(`face match ${response.status}`);
    const data = (await response.json()) as { similarity: number };
    return data.similarity;
  }
}

/**
 * Development stub. Sits below the auto-approval threshold on purpose: a made
 * up score must never approve an identity, so every case lands in the human
 * review queue.
 */
export class StubFaceComparator implements FaceComparator {
  async compare(): Promise<number> {
    return 0.5;
  }
}

/** The slice of the Rekognition client the adapter needs (easy to fake in tests). */
export type RekognitionSender = Pick<RekognitionClient, 'send'>;

export interface RekognitionFaceComparatorOptions {
  /** Bucket holding both the selfie and the main photo (S3_BUCKET). */
  bucket: string;
  client: RekognitionSender;
}

/**
 * Amazon Rekognition `CompareFaces` reading both images straight from S3.
 *
 * Rekognition can only read objects from real AWS S3 buckets in the same
 * account/region setup — not from MinIO or Cloudflare R2, even though the
 * upload path speaks the S3 API. The IAM identity needs
 * `rekognition:CompareFaces` plus `s3:GetObject` on the bucket.
 *
 * `SimilarityThreshold: 0` asks for every candidate match so the decision is
 * taken here (see `shouldAutoApprove`) instead of inside the vendor.
 */
export class RekognitionFaceComparator implements FaceComparator {
  private readonly bucket: string;
  private readonly client: RekognitionSender;

  constructor(options: RekognitionFaceComparatorOptions) {
    this.bucket = options.bucket;
    this.client = options.client;
  }

  async compare(selfieKey: string, photoKey: string): Promise<number> {
    const result = await this.client.send(
      new CompareFacesCommand({
        SourceImage: { S3Object: { Bucket: this.bucket, Name: selfieKey } },
        TargetImage: { S3Object: { Bucket: this.bucket, Name: photoKey } },
        SimilarityThreshold: 0,
      }),
    );
    const best = (result.FaceMatches ?? []).reduce(
      (max, match) => Math.max(max, match.Similarity ?? 0),
      0,
    );
    // Rekognition reports 0..100; the rest of the flow works in 0..1.
    return Math.min(1, Math.max(0, best / 100));
  }
}

/**
 * Picks the comparator from the environment:
 *
 * - `FACE_MATCH_PROVIDER=rekognition` → Amazon Rekognition on the S3 bucket.
 * - `FACE_MATCH_URL` set → generic HTTP vendor.
 * - otherwise → development stub (never auto-approves).
 *
 * Rekognition reuses the S3_* credentials; with S3_ACCESS_KEY empty it falls
 * back to the AWS default credential chain (instance role, env vars, etc.).
 * REKOGNITION_REGION overrides S3_REGION because Rekognition is not offered in
 * every region the bucket could live in.
 */
export function createFaceComparator(env: Env = process.env): FaceComparator {
  const provider = env.FACE_MATCH_PROVIDER?.trim().toLowerCase();
  if (provider === 'rekognition') {
    const accessKeyId = env.S3_ACCESS_KEY?.trim();
    const secretAccessKey = env.S3_SECRET_KEY?.trim();
    return new RekognitionFaceComparator({
      bucket: env.S3_BUCKET?.trim() || 'yugo-media',
      client: new RekognitionClient({
        region: env.REKOGNITION_REGION?.trim() || env.S3_REGION?.trim() || 'us-east-1',
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      }),
    });
  }
  const url = env.FACE_MATCH_URL?.trim();
  if (url) return new ExternalFaceComparator(url, env.FACE_MATCH_API_KEY?.trim() || undefined);
  return new StubFaceComparator();
}
