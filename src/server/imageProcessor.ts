import sharp from "sharp";

const DEFAULT_MAX_DIMENSION = 1024;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_INPUT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ImageValidationError {
  valid: false;
  error: string;
}

export interface ImageValidationSuccess {
  valid: true;
}

export type ImageValidationResult = ImageValidationError | ImageValidationSuccess;

function detectMimeTypeFromBase64(base64: string): string {
  // Remove data URL prefix if present
  const clean = base64.replace(/^data:image\/\w+;base64,/, "");
  const header = clean.slice(0, 8);
  const headerHex = Buffer.from(header, "base64").toString("hex");

  if (headerHex.startsWith("89504e47")) return "image/png";
  if (headerHex.startsWith("ffd8")) return "image/jpeg";
  if (headerHex.startsWith("52494646") || headerHex.startsWith("57454250")) return "image/webp";
  if (headerHex.startsWith("47494638")) return "image/gif";
  return "image/png"; // fallback
}

function stripDataUrl(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, "");
}

export function validateImage(base64: string): ImageValidationResult {
  const stripped = stripDataUrl(base64);
  const buffer = Buffer.from(stripped, "base64");

  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Image exceeds ${MAX_FILE_SIZE_MB}MB limit` };
  }

  if (buffer.byteLength === 0) {
    return { valid: false, error: "Invalid image data" };
  }

  return { valid: true };
}

export interface ProcessImageOptions {
  maxDimension?: number;
}

export async function processImage(base64: string, options: ProcessImageOptions = {}): Promise<ProcessedImage> {
  const { maxDimension = DEFAULT_MAX_DIMENSION } = options;
  const stripped = stripDataUrl(base64);
  const buffer = Buffer.from(stripped, "base64");
  const mimeType = detectMimeTypeFromBase64(base64);

  if (!SUPPORTED_INPUT_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported image format: ${mimeType}`);
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  let pipeline = image;

  // Resize if larger than max dimension while maintaining aspect ratio
  if (width > maxDimension || height > maxDimension) {
    pipeline = pipeline.resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to PNG for consistency (or keep JPEG if source is JPEG)
  const outputFormat = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpeg" : "png";
  const outputMimeType = outputFormat === "jpeg" ? "image/jpeg" : "image/png";

  if (outputFormat === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  const processedBuffer = await pipeline.toBuffer();
  const processedBase64 = processedBuffer.toString("base64");

  const finalMetadata = await sharp(processedBuffer).metadata();

  return {
    base64: processedBase64,
    mimeType: outputMimeType,
    width: finalMetadata.width || width,
    height: finalMetadata.height || height,
  };
}

export async function processImages(base64Images: string[], options: ProcessImageOptions = {}): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  for (const img of base64Images) {
    const validation = validateImage(img);
    if (!validation.valid) {
      console.warn("Image validation failed:", validation.error);
      continue;
    }
    try {
      const processed = await processImage(img, options);
      results.push(processed);
    } catch (e: any) {
      console.warn("Image processing failed:", e.message);
    }
  }
  return results;
}
