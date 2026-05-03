import { useState, useEffect, useRef } from 'react'

type Chat = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [message, setMessage] = useState('')
  const [chatLog, setChatLog] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatLog])

  const handleSend = async () => {
    // ✅ 1. ใช้ .trim() เพื่อดักไม่ให้ส่งข้อความที่มีแต่ช่องว่าง
    if (!message.trim() || isLoading) return

    const currentMsg = message.trim()

    // สร้าง message ใหม่
    const userMessage: Chat = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentMsg
    }

    // รวม history ใหม่
    const newHistory = [...chatLog, userMessage]

    // อัปเดต UI ทันที
    setChatLog(newHistory)
    setMessage('')
    setIsLoading(true)

    try {
      // จำกัด history กัน Token เต็ม
      const MAX_HISTORY = 10
      const trimmedHistory = newHistory.slice(-MAX_HISTORY)

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMsg,
          characterId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          history: trimmedHistory.map(chat => ({
            role: chat.role,
            content: chat.content
          }))
        })
      })

      const data = await response.json()

      // เพิ่มการตอบกลับจาก AI
      const aiMessage: Chat = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply
      }

      setChatLog(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Error:', error)

      setChatLog(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'ขอโทษทีค่ะ ระบบขัดข้องนิดหน่อย'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#fff',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '80vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #eee',
            textAlign: 'center'
          }}
        >
          <h2 style={{ margin: 0, color: '#ff8c00' }}>
            Maprang Project 🍊
          </h2>
          <small style={{ color: '#888' }}>
            น้องมะปรางพร้อมให้บริการค่ะ
          </small>
        </div>

        {/* Chat Box */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {chatLog.map((chat) => (
            <div
              key={chat.id}
              style={{
                alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: chat.role === 'user' ? '#ff8c00' : '#e9e9eb',
                color: chat.role === 'user' ? '#fff' : '#333',
                padding: '10px 15px',
                borderRadius: '15px',
                maxWidth: '80%',
                wordBreak: 'break-word',
                // ✅ 2. เพิ่มการบังคับขนาดขั้นต่ำและฟอนต์ กันกล่องแชทหดเหลือจุดเล็กๆ
                fontSize: '16px',
                lineHeight: '1.5',
                minWidth: '24px',
                minHeight: '24px'
              }}
            >
              {chat.content}
            </div>
          ))}

          {isLoading && (
            <div
              style={{
                alignSelf: 'flex-start',
                color: '#888',
                fontSize: '12px'
              }}
            >
              น้องมะปรางกำลังพิมพ์...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: '10px'
          }}
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="ส่งข้อความหาน้องมะปราง..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '25px',
              border: '1px solid #ddd',
              outline: 'none'
            }}
          />

          <button
            onClick={handleSend}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              backgroundColor: '#ff8c00',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  )
}

export default App