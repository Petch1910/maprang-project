import { useState } from 'react'
import { Play, Loader2, AlertCircle, CheckCircle, MessageSquare, Sparkles } from 'lucide-react'
import { logUnexpectedError } from '../lib/api'
import { toast } from './Toast'

interface PreviewMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PreviewChatProps {
  characterId?: string
  characterData?: {
    name: string
    tagline?: string | null
    greeting?: string | null
    persona?: string | null
    scenario?: string | null
  }
  onClose?: () => void
}

export function PreviewChat({ characterId, characterData, onClose }: PreviewChatProps) {
  const [messages, setMessages] = useState<PreviewMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [scenarios, setScenarios] = useState<Array<{ id: string; title: string; userMessage: string }>>([])
  const [estimatedTokens, setEstimatedTokens] = useState(0)

  // Load scenarios on mount
  useState(() => {
    loadScenarios()
  })

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/creator/scenarios?preset=basic')
      const data = await readApiJson(response)
      setScenarios(data.scenarios || [])
    } catch (error) {
      logUnexpectedError('Failed to load scenarios:', error)
    }
  }

  const handlePreview = async (message: string) => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setUserInput('')

    try {
      const response = await fetch('/api/creator/preview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          characterData,
          userMessage: message,
          mockMode: true, // Don't use real AI
        }),
      })

      if (!response.ok) {
        throw new Error('Preview failed')
      }

      const data = await readApiJson(response)

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || '[Mock Response]' },
      ])
      setEstimatedTokens(data.estimatedTokens || 0)

      toast.success('พรีวิวสำเร็จ!')
    } catch (error) {
      logUnexpectedError('Preview chat failed:', error)
      toast.error('ไม่สามารถพรีวิวได้ กรุณาลองใหม่')
      setMessages((prev) => prev.slice(0, -1)) // Remove user message
    } finally {
      setIsLoading(false)
    }
  }

  const handleScenarioSelect = (scenario: { userMessage: string }) => {
    setUserInput(scenario.userMessage)
  }

  const handleClear = () => {
    setMessages([])
    setEstimatedTokens(0)
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-700/50 bg-slate-800/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-slate-100">พรีวิวการสนทนา</h3>
          {characterData?.name && (
            <span className="text-sm text-slate-400">กับ {characterData.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {estimatedTokens > 0 && (
            <span className="text-xs text-slate-400">
              ~{estimatedTokens} tokens
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            ล้าง
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              ปิด
            </button>
          )}
        </div>
      </div>

      {/* Scenario Selector */}
      {scenarios.length > 0 && (
        <div className="border-b border-slate-700/50 p-3">
          <label className="mb-2 block text-xs font-medium text-slate-400">
            เลือกสถานการณ์ทดสอบ
          </label>
          <select
            value={selectedScenario}
            onChange={(e) => {
              setSelectedScenario(e.target.value)
              const scenario = scenarios.find((s) => s.id === e.target.value)
              if (scenario) handleScenarioSelect(scenario)
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-purple-500 focus:outline-none"
          >
            <option value="">-- เลือกสถานการณ์ --</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-slate-600" />
            <p className="mt-4 text-sm text-slate-400">
              พิมพ์ข้อความหรือเลือกสถานการณ์เพื่อทดสอบ
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 text-purple-100'
                    : 'bg-slate-700/50 text-slate-200'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="max-w-[80%] rounded-lg bg-slate-700/50 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handlePreview(userInput)
              }
            }}
            placeholder="พิมพ์ข้อความทดสอบ..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handlePreview(userInput)}
            disabled={isLoading || !userInput.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          💡 โหมด Mock: ไม่ใช้ AI จริง ประหยัดโทเคน
        </p>
      </div>
    </div>
  )
}
