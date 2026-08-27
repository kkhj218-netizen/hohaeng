import { createClient } from '@supabase/supabase-js';

import {
  optimizeEditorImage,
  toWebpStoragePath,
} from '@/app/lib/editorImageOptimization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 없습니다.');
}

if (!supabasePublishableKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 환경변수가 없습니다.'
  );
}

const supabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey
);

const optimizedStoragePaths = new Map<string, string>();
const originalStorageFrom =
  supabaseClient.storage.from.bind(supabaseClient.storage);

function storagePathKey(bucketId: string, path: string) {
  return `${bucketId}:${path}`;
}

supabaseClient.storage.from = ((bucketId: string) => {
  const bucket = originalStorageFrom(bucketId);

  if (bucketId !== 'hohaeng') {
    return bucket;
  }

  const originalUpload = bucket.upload.bind(bucket);
  const originalGetPublicUrl = bucket.getPublicUrl.bind(bucket);

  return new Proxy(bucket, {
    get(target, property) {
      if (property === 'upload') {
        return async (...args: Parameters<typeof originalUpload>) => {
          const [path, body, options] = args;

          const isEditorImage =
            typeof window !== 'undefined' &&
            typeof File !== 'undefined' &&
            path.startsWith('posts/') &&
            body instanceof File &&
            body.type.startsWith('image/');

          if (!isEditorImage) {
            return originalUpload(path, body, options);
          }

          const kind = path.startsWith('posts/og/') ? 'og' : 'content';
          const optimized = await optimizeEditorImage(body, kind);

          if (!optimized.optimized) {
            return originalUpload(path, body, options);
          }

          const optimizedPath = toWebpStoragePath(path);
          const result = await originalUpload(
            optimizedPath,
            optimized.file,
            {
              ...options,
              contentType: 'image/webp',
            }
          );

          if (!result.error) {
            optimizedStoragePaths.set(
              storagePathKey(bucketId, path),
              optimizedPath
            );

            const savedPercent =
              optimized.originalBytes > 0
                ? Math.max(
                    0,
                    Math.round(
                      (1 - optimized.outputBytes / optimized.originalBytes) * 100
                    )
                  )
                : 0;

            console.info(
              `[HOHAENG] 이미지 자동 최적화: ${optimized.width}x${optimized.height}, ` +
                `${Math.round(optimized.originalBytes / 1024)}KB → ` +
                `${Math.round(optimized.outputBytes / 1024)}KB (${savedPercent}% 절감)`
            );
          }

          return result;
        };
      }

      if (property === 'getPublicUrl') {
        return (...args: Parameters<typeof originalGetPublicUrl>) => {
          const [path, options] = args;
          const key = storagePathKey(bucketId, path);
          const optimizedPath = optimizedStoragePaths.get(key);

          if (optimizedPath) {
            optimizedStoragePaths.delete(key);
          }

          return originalGetPublicUrl(
            optimizedPath ?? path,
            options
          );
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}) as typeof supabaseClient.storage.from;

export const supabase = supabaseClient;
