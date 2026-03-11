import { useState, useEffect, useRef } from 'react'
import { Card } from '../ui'
import { MessageCircle, Plus, Send, Wifi, WifiOff, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from '../ui'
import { useTranslation } from '@/hooks/useTranslation'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  model: string
}

interface ModelInfo {
  id: string
  name: string
  description: string
}

// Static list of common models
const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most capable model for complex tasks' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient for simple tasks' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Previous generation flagship model' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s multimodal flagship model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Smaller, faster version of GPT-4o' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Enhanced GPT-4 with larger context' },
  { id: 'o1-preview', name: 'o1-preview', description: 'OpenAI\'s reasoning model (preview)' },
  { id: 'o1-mini', name: 'o1-mini', description: 'Smaller reasoning model' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Google\'s advanced multimodal model' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient Gemini model' }
]

export function ChatPage() {
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isServerOnline, setIsServerOnline] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0]

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Save conversations to storage
  const saveConversations = async (conversationsToSave: Conversation[]) => {
    try {
      const chatData = {
        conversations: conversationsToSave,
        activeConversationId,
        selectedModel,
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem('kiro-chat-conversations', JSON.stringify(chatData))
    } catch (error) {
      console.error('Failed to save conversations:', error)
    }
  }

  // Load conversations from storage
  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true)
      const data = localStorage.getItem('kiro-chat-conversations')
      if (data) {
        const chatData = JSON.parse(data)
        if (chatData.conversations && Array.isArray(chatData.conversations)) {
          // Convert date strings back to Date objects
          const loadedConversations = chatData.conversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }))
          setConversations(loadedConversations)
          if (chatData.activeConversationId) {
            setActiveConversationId(chatData.activeConversationId)
          }
          if (chatData.selectedModel) {
            setSelectedModel(chatData.selectedModel)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Fetch models from proxy server via HTTP API
  const fetchModelsFromProxy = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5580/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer dummy-key'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Models from proxy API:', data)
      
      if (data.data && Array.isArray(data.data)) {
        const models = data.data.map((model: any) => ({
          id: model.id,
          name: model.id.replace(/^anthropic\./, '').replace(/-v\d+:\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: model.id
        }))
        return models
      }
      return []
    } catch (error) {
      console.error('Error fetching models from proxy:', error)
      return []
    }
  }

  // Fetch available models
  const fetchModels = async () => {
    try {
      setIsLoadingModels(true)
      console.log('Fetching models...')
      
      let models: ModelInfo[] = []
      
      // Try to fetch from proxy HTTP API first
      if (isServerOnline) {
        models = await fetchModelsFromProxy()
      }
      
      // If no models from HTTP API, try the IPC API
      if (models.length === 0) {
        try {
          const result = await window.api.proxyGetModels()
          console.log('Models from IPC API:', result)
          
          if (result.success && result.models && result.models.length > 0) {
            models = result.models
          }
        } catch (error) {
          console.error('IPC API failed:', error)
        }
      }
      
      // Fallback to static models if both APIs fail
      if (models.length === 0) {
        console.warn('Using fallback models')
        models = AVAILABLE_MODELS
      }
      
      setAvailableModels(models)
      console.log('Final available models:', models)
      
      // Set default model if none selected
      if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0].id)
        console.log('Set default model:', models[0].id)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      // Fallback models
      setAvailableModels(AVAILABLE_MODELS)
      if (!selectedModel) {
        setSelectedModel(AVAILABLE_MODELS[0].id)
      }
    } finally {
      setIsLoadingModels(false)
    }
  }

  // Check server status
  const checkServerStatus = async () => {
    try {
      const status = await window.api.proxyGetStatus()
      setIsServerOnline(status.running)
    } catch (error) {
      setIsServerOnline(false)
    }
  }

  // Create new conversation
  const createNewConversation = () => {
    const modelToUse = selectedModel || (availableModels.length > 0 ? availableModels[0].id : 'claude-3-5-sonnet-20241022')
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: isEn ? 'New Chat' : '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: modelToUse
    }
    const updatedConversations = [newConversation, ...conversations]
    setConversations(updatedConversations)
    setActiveConversationId(newConversation.id)
    if (!selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0].id)
    }
  }

  // Switch conversation and update selected model
  const switchConversation = (conversationId: string) => {
    setActiveConversationId(conversationId)
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setSelectedModel(conversation.model)
    }
    // Save the active conversation change
    setTimeout(() => {
      const chatData = {
        conversations,
        activeConversationId: conversationId,
        selectedModel: conversation?.model || selectedModel,
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem('kiro-chat-conversations', JSON.stringify(chatData))
    }, 0)
  }

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    setShowModelDropdown(false)
    
    // Update current conversation's model if one is active
    if (activeConversationId) {
      const updatedConversations = conversations.map(conv => 
        conv.id === activeConversationId 
          ? { ...conv, model: modelId }
          : conv
      )
      setConversations(updatedConversations)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Send message
  // Send message
    const sendMessage = async () => {
      if (!message.trim() || !isServerOnline || isLoading) return

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message.trim(),
        timestamp: new Date(),
        model: selectedModel
      }

      let currentActiveConversationId = activeConversationId

      // Add user message to conversation
      if (activeConversationId) {
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversationId 
            ? {
                ...conv,
                messages: [...conv.messages, userMessage],
                title: conv.messages.length === 0 ? message.trim().slice(0, 30) + (message.trim().length > 30 ? '...' : '') : conv.title,
                updatedAt: new Date(),
                model: selectedModel // Update conversation model
              }
            : conv
        ))
      } else {
        // Create new conversation if none exists
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: message.trim().slice(0, 30) + (message.trim().length > 30 ? '...' : ''),
          messages: [userMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: selectedModel
        }
        currentActiveConversationId = newConversation.id
        setConversations(prev => [newConversation, ...prev])
        setActiveConversationId(newConversation.id)
        if (!selectedModel && availableModels.length > 0) {
          setSelectedModel(availableModels[0].id)
        }
      }

      const currentMessage = message.trim()
      setMessage('')
      setIsLoading(true)

      try {
        // Use the real chat completion API
        const result = await window.api.proxyChatCompletion(
          [{ role: 'user', content: currentMessage }],
          selectedModel,
          { temperature: 0.7, max_tokens: 4000 }
        )

        if (result.success && result.content) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.content,
            timestamp: new Date(),
            model: selectedModel
          }

          setConversations(prev => prev.map(conv => 
            conv.id === currentActiveConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, assistantMessage],
                  updatedAt: new Date()
                }
              : conv
          ))
        } else {
          throw new Error(result.error || 'No response received')
        }
      } catch (error) {
        console.error('Chat API error:', error)

        // Add error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to get response from AI service'}`,
          timestamp: new Date(),
          model: selectedModel
        }

        setConversations(prev => prev.map(conv => 
          conv.id === currentActiveConversationId
            ? {
                ...conv,
                messages: [...conv.messages, errorMessage],
                updatedAt: new Date()
              }
            : conv
        ))
      } finally {
        setIsLoading(false)
      }
    }

  // Handle textarea change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load conversations and check server status on mount
  useEffect(() => {
    console.log('ChatPage mounted, loading conversations and checking server status')
    loadConversations()
    checkServerStatus()
    fetchModels()
    const interval = setInterval(checkServerStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch models when server comes online
  useEffect(() => {
    console.log('Server status changed:', isServerOnline)
    if (isServerOnline) {
      fetchModels()
    }
  }, [isServerOnline])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  // Save conversations whenever they change (debounced)
  useEffect(() => {
    if (conversations.length > 0 && !isLoadingConversations) {
      const timeoutId = setTimeout(() => {
        saveConversations(conversations)
      }, 500) // Debounce saves by 500ms
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [conversations, activeConversationId, selectedModel, isLoadingConversations])

  return (
    <div className="flex-1 p-6 space-y-6 overflow-hidden">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/25">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{isEn ? 'Chat' : '对话'}</h1>
            <p className="text-muted-foreground">{isEn ? 'AI-powered conversations through your proxy.' : '通过代理服务器进行AI对话'}</p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-[32px] overflow-hidden flex-1 flex flex-col h-[600px]">
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{isEn ? 'Chat' : '对话'}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewConversation}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {isEn ? 'New Chat' : '新对话'}
                </Button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm text-center">{isEn ? 'No conversations yet' : '暂无对话'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        activeConversationId === conv.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-sm truncate mb-1">
                        {conv.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>{conv.messages.length} {isEn ? 'messages' : '条消息'}</span>
                        <span className="text-xs bg-muted/50 px-2 py-0.5 rounded">
                          {availableModels.find(m => m.id === conv.model)?.name?.split(' ')[0] || conv.model.split('-')[0] || 'Model'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {!isServerOnline ? (
              /* Server Offline State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <WifiOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">{isEn ? 'Server offline' : '服务器离线'}</h3>
                  <p className="text-sm">{isEn ? 'Please start the server first' : '请先启动服务器'}</p>
                </div>
              </div>
            ) : !activeConversation ? (
              /* No Conversation Selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">{isEn ? 'Select a conversation' : '选择一个对话'}</h3>
                  <p className="text-sm mb-4">{isEn ? 'Choose a chat or start a new one' : '选择一个对话或开始新对话'}</p>
                  <Button onClick={createNewConversation} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isEn ? 'New Chat' : '新对话'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Active Conversation */
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        <div className={`text-xs mt-1 opacity-70 ${
                          msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">{isEn ? 'Thinking...' : '思考中...'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isEn ? 'Type your message...' : '输入您的消息...'}
                        className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[48px] max-h-[120px]"
                        rows={1}
                      />
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim() || !isServerOnline || isLoading}
                      size="sm"
                      className="h-12 w-12 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Status Bar */}
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {isServerOnline ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Wifi className="h-3 w-3 text-green-500" />
                            <span>{isEn ? 'Online' : '在线'}</span>
                          </div>
                          {/* Model Selector */}
                          <div className="relative" ref={modelDropdownRef}>
                            <button
                              onClick={() => setShowModelDropdown(!showModelDropdown)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors"
                              disabled={isLoadingModels || availableModels.length === 0}
                            >
                              <span className="font-medium">
                                {isLoadingModels 
                                  ? (isEn ? 'Loading...' : '加载中...') 
                                  : (currentModel?.name || selectedModel || 'Select Model')
                                }
                              </span>
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            
                            {showModelDropdown && !isLoadingModels && (
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                <div className="p-2 border-b flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {isEn ? 'Available Models' : '可用模型'}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchModels}
                                    className="h-6 w-6 p-0"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </div>
                                {availableModels.map((model) => (
                                  <button
                                    key={model.id}
                                    onClick={() => handleModelChange(model.id)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                                      selectedModel === model.id ? 'bg-primary/10 text-primary' : ''
                                    }`}
                                  >
                                    <div className="font-medium">{model.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{model.description || model.id}</div>
                                  </button>
                                ))}
                                {availableModels.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                    {isEn ? 'No models available' : '暂无可用模型'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 text-red-500" />
                          <span>{isEn ? 'Server offline' : '服务器离线'}</span>
                        </>
                      )}
                    </div>
                    <div>
                      {isEn ? 'Press Enter to send, Shift+Enter for new line' : '按 Enter 发送，Shift+Enter 换行'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}