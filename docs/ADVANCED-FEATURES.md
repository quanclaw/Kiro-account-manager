# Advanced Features

Advanced capabilities ported from [kiro-gateway](https://github.com/jwadow/kiro-gateway) to enhance Kiro Account Manager's proxy functionality.

## 🧠 Extended Thinking Support

Parse and extract reasoning/thinking blocks from AI model responses.

### Features
- Detects `<thinking>`, `<think>`, `<reasoning>` tags in responses
- Multiple handling modes:
  - `as_reasoning_content` - Extract to separate reasoning field
  - `remove` - Remove thinking blocks completely
  - `pass` - Pass through with original tags
  - `strip_tags` - Remove tags but keep content
- Handles tags split across multiple chunks
- Finite state machine (FSM) for reliable parsing

### Usage

```typescript
import { ThinkingParser } from './proxy/thinkingParser'

const parser = new ThinkingParser('as_reasoning_content')

// Feed chunks as they arrive
const result = parser.feed('<thinking>Let me analyze this...</thinking>Hello!')

console.log(result.thinkingContent)  // "Let me analyze this..."
console.log(result.regularContent)   // "Hello!"
console.log(result.isFirstThinkingChunk)  // true
console.log(result.isLastThinkingChunk)   // true
```

### API

```typescript
class ThinkingParser {
  constructor(
    handlingMode?: ThinkingHandlingMode,
    openTags?: string[],
    initialBufferSize?: number
  )
  
  feed(content: string): ThinkingParseResult
  getState(): ParserState
  hasThinkingBlock(): boolean
  reset(): void
}

interface ThinkingParseResult {
  thinkingContent: string | null
  regularContent: string | null
  isFirstThinkingChunk: boolean
  isLastThinkingChunk: boolean
  stateChanged: boolean
}
```

## 👁️ Vision Support

Process and send images to multi-modal AI models.

### Features
- Parse data URLs (base64 encoded images)
- Support multiple image formats: JPEG, PNG, GIF, WebP
- Extract images from message content
- Validate image size (max 5MB)
- Convert buffers to data URLs

### Usage

```typescript
import { processImageForKiro, hasImages } from './proxy/visionSupport'

// Process image from data URL
const image = processImageForKiro('data:image/jpeg;base64,/9j/4AAQ...')

// Check if message has images
const messageHasImages = hasImages(messageContent)

// Extract all images from content
const images = extractImagesFromContent(messageContent)
```

### API

```typescript
// Process image for Kiro API
function processImageForKiro(
  imageInput: string | Buffer,
  mediaType?: string
): ProcessedImage | null

// Parse data URL
function parseDataUrl(dataUrl: string): ImageData | null

// Check if content has images
function hasImages(content: any): boolean

// Extract images from content
function extractImagesFromContent(content: any): ProcessedImage[]

// Validate image size
function validateImageSize(base64Data: string, maxSizeMB?: number): boolean
```

### Supported Formats
- JPEG/JPG
- PNG
- GIF
- WebP

## 🔄 Truncation Recovery

Detect and handle incomplete/truncated API responses.

### Features
- Detect truncated JSON responses
- Check for unbalanced braces/brackets
- Validate streaming responses
- Automatic retry with exponential backoff
- Attempt JSON repair
- Extract partial data from truncated responses

### Usage

```typescript
import {
  checkJsonTruncation,
  getRecoveryStrategy,
  attemptJsonRepair
} from './proxy/truncationRecovery'

// Check if response is truncated
const result = checkJsonTruncation(responseJson)

if (result.isTruncated) {
  console.log('Truncated:', result.reason)
  
  // Get recovery strategy
  const strategy = getRecoveryStrategy(result, attemptCount)
  
  if (strategy.shouldRetry) {
    // Retry after delay
    setTimeout(() => retry(), strategy.retryDelay)
  } else {
    // Try to repair JSON
    const repaired = attemptJsonRepair(responseJson)
    if (repaired) {
      // Use repaired JSON
    }
  }
}
```

### API

```typescript
// Check JSON truncation
function checkJsonTruncation(jsonStr: string): TruncationCheckResult

// Check streaming truncation
function checkStreamTruncation(chunks: string[]): TruncationCheckResult

// Get recovery strategy
function getRecoveryStrategy(
  truncationResult: TruncationCheckResult,
  attemptCount?: number
): RecoveryStrategy

// Attempt to repair JSON
function attemptJsonRepair(truncatedJson: string): string | null

// Extract partial data
function extractPartialData(truncatedJson: string): any

interface TruncationCheckResult {
  isTruncated: boolean
  reason?: string
  sizeBytes?: number
  confidence?: 'high' | 'medium' | 'low'
}

interface RecoveryStrategy {
  shouldRetry: boolean
  retryDelay?: number
  maxRetries?: number
  fallbackAction?: 'use_partial' | 'return_error' | 'request_continuation'
}
```

## 📦 Import All Features

```typescript
import {
  // Thinking Parser
  ThinkingParser,
  ParserState,
  
  // Vision Support
  processImageForKiro,
  hasImages,
  extractImagesFromContent,
  
  // Truncation Recovery
  checkJsonTruncation,
  getRecoveryStrategy,
  attemptJsonRepair
} from './proxy/advancedFeatures'
```

## 🎯 Use Cases

### Thinking Parser
- Debug AI reasoning process
- Extract model's thought process
- Improve prompt engineering
- Understand model behavior

### Vision Support
- Multi-modal conversations
- Image analysis
- Visual question answering
- Document understanding

### Truncation Recovery
- Improve reliability
- Handle network issues
- Recover from incomplete responses
- Reduce failed requests

## 🔗 Credits

These features are based on the excellent work from [kiro-gateway](https://github.com/jwadow/kiro-gateway) by [@Jwadow](https://github.com/jwadow).

## 📝 License

AGPL-3.0 - Same as kiro-gateway
