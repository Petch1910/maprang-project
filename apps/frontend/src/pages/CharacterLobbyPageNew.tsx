import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Heart,
  Eye,
  Share2,
  MoreVertical,
  User,
  Sparkles,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import type { Character } from '../lib/api'

export function CharacterLobbyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [character, setCharacter] = useState<Character | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const loadCharacter = async () => {
      setIsLoading(true)
      // Mock loading
      setTimeout(() => {
        setCharacter({
          id: id!,
          name: 'ตัวอย่างตัวละคร',
          tagline: 'คำโปรยตัวละคร',
          greeting: 'สวัสดี! ยินดีที่ได้รู้จัก',
          persona: 'บุคลิกตัวละคร...',
          scenario: 'สถานการณ์...',
          visibility: 'public' as const,
          isNsfw: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          creatorId: 'user-1',
          viewCount: 1234,
          chatCount: 567,
          favoriteCount: 89,
        })
        setIsLoading(false)
      }, 500)
    }
    loadCharacter()
  }, [id])

  const handleStartChat = () => {
    // Navigate to chat creation or existing chat
    navigate(`/chat/new?character=${id}`)
  }

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-5xl">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <User className="mx-auto h-16 w-16 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-300">ไม่พบตัวละคร</h2>
          <p className="mt-2 text-slate-500">ตัวละครนี้อาจถูกลบหรือไม่มีอยู่</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-500"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      {/* Hero Section */}
      <div className="relative border-b border-slate-800 bg-gradient-to-b from-purple-900/20 to-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {character.avatarUrl ? (
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="h-48 w-48 rounded-2xl object-cover ring-4 ring-purple-600/30"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 ring-4 ring-purple-600/30">
                  <User className="h-24 w-24 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-white">{character.name}</h1>
                  {character.tagline && (
                    <p className="mt-2 text-lg text-slate-300">{character.tagline}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  title="เพิ่มเติม"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Eye className="h-4 w-4" />
                  {character.viewCount?.toLocaleString() || 0} ครั้ง
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <MessageCircle className="h-4 w-4" />
                  {character.chatCount?.toLocaleString() || 0} แชท
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Heart className="h-4 w-4" />
                  {character.favoriteCount?.toLocaleString() || 0} ถูกใจ
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  สร้างเมื่อ {new Date(character.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-500"
                >
                  <MessageCircle className="h-5 w-5" />
                  เริ่มการสนทนา
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition ${
                    isFavorite
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'ถูกใจแล้ว' : 'ถูกใจ'}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-700/50"
                >
                  <Share2 className="h-5 w-5" />
                  แชร์
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-6">
          {/* Greeting */}
          {character.greeting && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                การทักทาย
              </h2>
              <p className="text-slate-300">{character.greeting}</p>
            </div>
          )}

          {/* Persona */}
          {character.persona && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                <User className="h-5 w-5 text-blue-400" />
                บุคลิกภาพ
              </h2>
              <p className="whitespace-pre-wrap text-slate-300">{character.persona}</p>
            </div>
          )}

          {/* Scenario */}
          {character.scenario && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-green-400" />
                สถานการณ์
              </h2>
              <p className="whitespace-pre-wrap text-slate-300">{character.scenario}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
