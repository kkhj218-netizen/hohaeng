export type EditorImageKind = 'content' | 'og';

export type OptimizedEditorImage = {
  file: File;
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
  width: number | null;
  height: number | null;
};

type ImageConfig = {
  maxWidth: number;
  maxHeight: number;
  targetBytes: number;
  qualities: number[];
};

const IMAGE_CONFIG: Record<EditorImageKind, ImageConfig> = {
  content: {
    maxWidth: 1600,
    maxHeight: 1600,
    targetBytes: 650 * 1024,
    qualities: [0.82, 0.76, 0.7, 0.64],
  },
  og: {
    maxWidth: 1200,
    maxHeight: 1200,
    targetBytes: 450 * 1024,
    qualities: [0.84, 0.8, 0.76, 0.72],
  },
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function shouldPreserveOriginal(file: File) {
  return file.type === 'image/svg+xml' || file.type === 'image/gif';
}

function webpName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '') || 'image';
  return `${baseName}.webp`;
}

function toWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality);
  });
}

async function loadImage(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });

      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
          ctx.drawImage(bitmap, 0, 0, width, height);
        },
        close: () => bitmap.close(),
      };
    } catch {
      // Safari/HEIC 등에서 createImageBitmap이 실패하면 img 엘리먼트로 재시도한다.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.drawImage(image, 0, 0, width, height);
      },
      close: () => undefined,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resizedDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function toWebpStoragePath(path: string) {
  const withoutExt = path.replace(/\.[^/.]+$/, '');
  return `${withoutExt}.webp`;
}

export async function optimizeEditorImage(
  file: File,
  kind: EditorImageKind
): Promise<OptimizedEditorImage> {
  const fallback: OptimizedEditorImage = {
    file,
    optimized: false,
    originalBytes: file.size,
    outputBytes: file.size,
    width: null,
    height: null,
  };

  if (
    !isBrowser() ||
    !file.type.startsWith('image/') ||
    shouldPreserveOriginal(file)
  ) {
    return fallback;
  }

  const config = IMAGE_CONFIG[kind];

  try {
    const source = await loadImage(file);
    const dimensions = resizedDimensions(
      source.width,
      source.height,
      config.maxWidth,
      config.maxHeight
    );

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d', {
      alpha: true,
    });

    if (!context) {
      source.close();
      return fallback;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    source.draw(context, dimensions.width, dimensions.height);
    source.close();

    let selectedBlob: Blob | null = null;

    for (const quality of config.qualities) {
      const blob = await toWebpBlob(canvas, quality);

      if (!blob || blob.type !== 'image/webp') {
        continue;
      }

      selectedBlob = blob;

      if (blob.size <= config.targetBytes) {
        break;
      }
    }

    if (!selectedBlob) {
      return fallback;
    }

    const optimizedFile = new File(
      [selectedBlob],
      webpName(file.name),
      {
        type: 'image/webp',
        lastModified: Date.now(),
      }
    );

    return {
      file: optimizedFile,
      optimized: true,
      originalBytes: file.size,
      outputBytes: optimizedFile.size,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.warn('이미지 최적화 실패, 원본 업로드로 전환:', error);
    return fallback;
  }
}
