// Thinking Block Parser for Streaming Responses
// Parses <thinking>, <think>, <reasoning> tags from AI responses
// Based on kiro-gateway implementation

export enum ParserState {
  PRE_CONTENT = 0,    // Initial state, buffering to detect opening tag
  IN_THINKING = 1,    // Inside thinking block, buffering until closing tag
  STREAMING = 2       // Regular streaming, no more thinking block detection
}

export interface ThinkingParseResult {
  thinkingContent: string | null      // Content to be sent as reasoning
  regularContent: string | null       // Regular content to be sent as delta
  isFirstThinkingChunk: boolean       // True if this is the first chunk of thinking
  isLastThinkingChunk: boolean        // True if thinking block just closed
  stateChanged: boolean               // True if parser state changed
}

export type ThinkingHandlingMode = 'as_reasoning_content' | 'remove' | 'pass' | 'strip_tags'

export class ThinkingParser {
  private handlingMode: ThinkingHandlingMode
  private openTags: string[]
  private initialBufferSize: number
  private maxTagLength: number
  
  private state: ParserState
  private initialBuffer: string
  private thinkingBuffer: string
  private openTag: string | null
  private closeTag: string | null
  private isFirstThinkingChunk: boolean
  private thinkingBlockFound: boolean

  constructor(
    handlingMode: ThinkingHandlingMode = 'as_reasoning_content',
    openTags: string[] = ['<thinking>', '<think>', '<reasoning>'],
    initialBufferSize: number = 100
  ) {
    this.handlingMode = handlingMode
    this.openTags = openTags
    this.initialBufferSize = initialBufferSize
    
    // Calculate max tag length for cautious buffering
    this.maxTagLength = Math.max(...this.openTags.map(tag => tag.length)) * 2
    
    this.state = ParserState.PRE_CONTENT
    this.initialBuffer = ''
    this.thinkingBuffer = ''
    this.openTag = null
    this.closeTag = null
    this.isFirstThinkingChunk = true
    this.thinkingBlockFound = false
  }

  /**
   * Process a chunk of content through the parser
   */
  feed(content: string): ThinkingParseResult {
    const result: ThinkingParseResult = {
      thinkingContent: null,
      regularContent: null,
      isFirstThinkingChunk: false,
      isLastThinkingChunk: false,
      stateChanged: false
    }

    if (!content) {
      return result
    }

    if (this.state === ParserState.PRE_CONTENT) {
      return this.handlePreContent(content)
    } else if (this.state === ParserState.IN_THINKING) {
      return this.handleInThinking(content)
    } else {
      // STREAMING state - pass through
      result.regularContent = content
      return result
    }
  }

  /**
   * Handle PRE_CONTENT state - looking for opening tag
   */
  private handlePreContent(content: string): ThinkingParseResult {
    const result: ThinkingParseResult = {
      thinkingContent: null,
      regularContent: null,
      isFirstThinkingChunk: false,
      isLastThinkingChunk: false,
      stateChanged: false
    }

    this.initialBuffer += content

    // Check if any opening tag is found
    for (const tag of this.openTags) {
      const tagIndex = this.initialBuffer.indexOf(tag)
      if (tagIndex !== -1) {
        // Found opening tag!
        this.openTag = tag
        this.closeTag = tag.replace('<', '</')
        this.thinkingBlockFound = true
        
        // Content before tag is regular content
        if (tagIndex > 0) {
          result.regularContent = this.initialBuffer.substring(0, tagIndex)
        }
        
        // Content after tag goes to thinking buffer
        const afterTag = this.initialBuffer.substring(tagIndex + tag.length)
        this.thinkingBuffer = afterTag
        
        // Change state
        this.state = ParserState.IN_THINKING
        result.stateChanged = true
        
        // Check if we have content to send
        if (this.thinkingBuffer.length > this.maxTagLength) {
          const sendPart = this.thinkingBuffer.substring(0, this.thinkingBuffer.length - this.maxTagLength)
          this.thinkingBuffer = this.thinkingBuffer.substring(this.thinkingBuffer.length - this.maxTagLength)
          
          result.thinkingContent = this.processThinkingContent(sendPart)
          result.isFirstThinkingChunk = this.isFirstThinkingChunk
          this.isFirstThinkingChunk = false
        }
        
        return result
      }
    }

    // No tag found yet - check if buffer exceeded limit
    if (this.initialBuffer.length > this.initialBufferSize) {
      // No thinking block - switch to streaming
      this.state = ParserState.STREAMING
      result.stateChanged = true
      result.regularContent = this.initialBuffer
      this.initialBuffer = ''
    }

    return result
  }

  /**
   * Handle IN_THINKING state - looking for closing tag
   */
  private handleInThinking(content: string): ThinkingParseResult {
    const result: ThinkingParseResult = {
      thinkingContent: null,
      regularContent: null,
      isFirstThinkingChunk: false,
      isLastThinkingChunk: false,
      stateChanged: false
    }

    this.thinkingBuffer += content

    // Check for closing tag
    if (this.closeTag) {
      const closeIndex = this.thinkingBuffer.indexOf(this.closeTag)
      if (closeIndex !== -1) {
        // Found closing tag!
        const thinkingContent = this.thinkingBuffer.substring(0, closeIndex)
        const afterClose = this.thinkingBuffer.substring(closeIndex + this.closeTag.length)
        
        // Send remaining thinking content
        if (thinkingContent) {
          result.thinkingContent = this.processThinkingContent(thinkingContent)
          result.isFirstThinkingChunk = this.isFirstThinkingChunk
          this.isFirstThinkingChunk = false
        }
        
        result.isLastThinkingChunk = true
        
        // Switch to streaming
        this.state = ParserState.STREAMING
        result.stateChanged = true
        
        // Content after closing tag is regular content
        if (afterClose) {
          result.regularContent = afterClose
        }
        
        this.thinkingBuffer = ''
        return result
      }
    }

    // No closing tag yet - use cautious sending
    if (this.thinkingBuffer.length > this.maxTagLength) {
      const sendPart = this.thinkingBuffer.substring(0, this.thinkingBuffer.length - this.maxTagLength)
      this.thinkingBuffer = this.thinkingBuffer.substring(this.thinkingBuffer.length - this.maxTagLength)
      
      result.thinkingContent = this.processThinkingContent(sendPart)
      result.isFirstThinkingChunk = this.isFirstThinkingChunk
      this.isFirstThinkingChunk = false
    }

    return result
  }

  /**
   * Process thinking content based on handling mode
   */
  private processThinkingContent(content: string): string | null {
    switch (this.handlingMode) {
      case 'as_reasoning_content':
        return content
      case 'remove':
        return null
      case 'pass':
        return this.openTag + content + (this.state === ParserState.STREAMING ? this.closeTag : '')
      case 'strip_tags':
        return content
      default:
        return content
    }
  }

  /**
   * Get current parser state
   */
  getState(): ParserState {
    return this.state
  }

  /**
   * Check if thinking block was found
   */
  hasThinkingBlock(): boolean {
    return this.thinkingBlockFound
  }

  /**
   * Reset parser to initial state
   */
  reset(): void {
    this.state = ParserState.PRE_CONTENT
    this.initialBuffer = ''
    this.thinkingBuffer = ''
    this.openTag = null
    this.closeTag = null
    this.isFirstThinkingChunk = true
    this.thinkingBlockFound = false
  }
}
