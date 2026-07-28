import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | null = null;

export function getS3Client() {
  if (client) return client;
  client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  return client;
}

async function ensureBucket(bucket: string) {
  const s3 = getS3Client();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch {
      // race with minio-init
    }
  }
}

export async function ensureBuckets() {
  await ensureBucket(env.S3_BUCKET_GAMES);
  await ensureBucket(env.S3_BUCKET_UPLOADS);
}

export function publicObjectUrl(bucket: string, key: string) {
  return `${env.S3_PUBLIC_ENDPOINT}/${bucket}/${key}`;
}

export async function putObject(params: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}) {
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
  return publicObjectUrl(params.bucket, params.key);
}

export async function getObjectBuffer(bucket: string, key: string) {
  const s3 = getS3Client();
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty object body");
  return Buffer.from(bytes);
}

export async function deleteObject(bucket: string, key: string) {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getPresignedPutUrl(params: {
  bucket: string;
  key: string;
  contentType?: string;
  expiresIn?: number;
}) {
  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: params.expiresIn ?? 3600 });
}

export function gamesBucket() {
  return env.S3_BUCKET_GAMES;
}

export function uploadsBucket() {
  return env.S3_BUCKET_UPLOADS;
}
