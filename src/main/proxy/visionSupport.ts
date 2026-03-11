// Vision Support - Image Input Processing
// Handles image encoding and data URL parsing for multi-modal conversations

export interface ImageData {
  format: string      // jpeg, png, gif, webp
  data: string        // base64 encoded data
  mediaType: string   // image/jpeg, image/png, etc.
}

export interface ProcessedImage {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

/**
 * Parse data URL and extract image data
 * Format: data:image/jpeg;base64,/9j/4AAQ...
 */
export function parseDataUrl(dataUrl: string): ImageData | null {
  try {
    if (!dataUrl.startsWith('data:')) {
      return null
    }

    const [header, data] = dataUrl.split(',', 2)
    if (!header || !data) {
      return null
    }

    // Extract media type from "data:image/jpeg;base64"
    const mediaPart = header.split(';')[0] // "data:image/jpeg"
    const mediaType = mediaPart.replace('data:', '') // "image/jpeg"
    
    // Extract format from media type: "image/jpeg" -> "jpeg"
    const format = mediaType.split('/').pop() || 'jpeg'

    return {
      format,
      data,
      mediaType
    }
  } catch (error) {
    console.error('[VisionSupport] Failed to parse data URL:', error)
    return null
  }
}

/**
 * Convert image buffer to base64 data URL
 */
export function bufferToDataUrl(buffer: Buffer, mediaType: string = 'image/jpeg'): string {
  const base64 = buffer.toString('base64')
  return `data:${mediaType};base64,${base64}`
}

/**
 * Validate image format
 */
export function isValidImageFormat(format: string): boolean {
  const validFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp']
  return validFormats.includes(format.toLowerCase())
}

/**
 * Process image for Kiro API
 * Converts various image formats to Kiro-compatible format
 */
export function processImageForKiro(imageInput: string | Buffer, mediaType?: string): ProcessedImage | null {
  try {
    let imageData: ImageData | null = null

    if (typeof imageInput === 'string') {
      // Parse data URL
      imageData = parseDataUrl(imageInput)
    } else if (Buffer.isBuffer(imageInput)) {
      // Convert buffer to base64
      const base64 = imageInput.toString('base64')
      const type = mediaType || 'image/jpeg'
      const format = type.split('/').pop() || 'jpeg'
      
      imageData = {
        format,
        data: base64,
        mediaType: type
      }
    }

    if (!imageData) {
      return null
    }

    // Validate format
    if (!isValidImageFormat(imageData.format)) {
      console.warn(`[VisionSupport] Unsupported image format: ${imageData.format}`)
      return null
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageData.mediaType,
        data: imageData.data
      }
    }
  } catch (error) {
    console.error('[VisionSupport] Failed to process image:', error)
    return null
  }
}

/**
 * Extract images from message content
 * Supports both text and image content blocks
 */
export function extractImagesFromContent(content: any): ProcessedImage[] {
  const images: ProcessedImage[] = []

  try {
    if (Array.isArray(content)) {
      // Content is array of blocks
      for (const block of content) {
        if (block.type === 'image' && block.source) {
          images.push(block as ProcessedImage)
        } else if (block.type === 'image_url' && block.image_url) {
          // OpenAI format
          const processed = processImageForKiro(block.image_url.url)
          if (processed) {
            images.push(processed)
          }
        }
      }
    } else if (typeof content === 'object' && content.type === 'image') {
      // Single image block
      images.push(content as ProcessedImage)
    }
  } catch (error) {
    console.error('[VisionSupport] Failed to extract images:', error)
  }

  return images
}

/**
 * Check if message contains images
 */
export function hasImages(content: any): boolean {
  return extractImagesFromContent(content).length > 0
}

/**
 * Get image count from content
 */
export function getImageCount(content: any): number {
  return extractImagesFromContent(content).length
}

/**
 * Validate image size (max 5MB for most models)
 */
export function validateImageSize(base64Data: string, maxSizeMB: number = 5): boolean {
  try {
    // Calculate size from base64 string
    const sizeBytes = (base64Data.length * 3) / 4
    const sizeMB = sizeBytes / (1024 * 1024)
    
    return sizeMB <= maxSizeMB
  } catch {
    return false
  }
}

/**
 * Get image dimensions from base64 data (requires image-size package)
 * This is a placeholder - actual implementation would need image-size library
 */
export function getImageDimensions(_base64Data: string): { width: number; height: number } | null {
  // TODO: Implement with image-size library if needed
  return null
}
