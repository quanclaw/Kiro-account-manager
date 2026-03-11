// Advanced Features - Extended capabilities from kiro-gateway
// Exports thinking parser, vision support, and truncation recovery

export {
  ThinkingParser,
  ParserState,
  type ThinkingParseResult,
  type ThinkingHandlingMode
} from './thinkingParser'

export {
  parseDataUrl,
  bufferToDataUrl,
  isValidImageFormat,
  processImageForKiro,
  extractImagesFromContent,
  hasImages,
  getImageCount,
  validateImageSize,
  type ImageData,
  type ProcessedImage
} from './visionSupport'

export {
  checkJsonTruncation,
  checkStreamTruncation,
  getRecoveryStrategy,
  attemptJsonRepair,
  extractPartialData,
  logTruncation,
  createTruncationError,
  type TruncationCheckResult,
  type RecoveryStrategy
} from './truncationRecovery'
