import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Play, Save, Eye, AlertCircle, Image as ImageIcon, Wand2 } from 'lucide-react'
import { CharacterCreateForm, type CreatorDraftStatus } from '../components/CharacterCreateForm'
import { PreviewChat } from '../components/PreviewChat'
import { ApiError, createCharacter, type Character, type CharacterInput } from '../lib/api'
import { toast } from '../components/Toast'
import { logUnexpectedError } from '../lib/api'

const defaultDraftStatus: CreatorDraftStatus = {
  hasName: false,
  hasTagline: false,
  hasGreeting: false,
  hasPersona: false,
  hasScenario: false,
  hasVisibility: false,
  hasAvatar: false,
}

function createErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'สร้างตัวละครไม่สำเร็จ กรุณาลองใหม่'
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบก่อนสร้างตัวละคร'
  if (error.status === 403) return 'บัญชีนี้ยังไม่มีสิทธิ์สร้างหรือเผยแพร่ตัวละคร'
  if (error.status === 413) return 'ข้อมูลตัวละครใหญ่เกินไป กรุณาลดความยาว'
  return 'สร้างตัวละครไม่สำเร็จ กรุณาตรวจสอบและลองใหม่'
}

export function CreatorStudioPage() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null)
  const [error, setError] = useState('')
  const [draftStatus, setDraftStatus] = useState<CreatorDraftStatus>(defaultDraftStatus)
  const [showPreview, setShowPreview] = useState(false)
  const [characterData, setCharacterData] = useState<CharacterInput | null>(null)

  const handleCreate = async (input: CharacterInput) => {
    setIsSaving(true)
    setError('')

    try {
      const character = await createCharacter(input)
      setCreatedCharacter(character)
      toast.success('สร้างตัวละครสำเร็จ! 🎉')

      // Redirect to character page after 2 seconds
      setTimeout(() => {
        navigate(`/characters/${character.id}`)
      }, 2000)
    } catch (err) {
      logUnexpectedError('Create character failed:', err)
      const message = createErrorMessage(err)
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = (input: CharacterInput) => {
    setCharacterData(input)
    setShowPreview(true)
  }

  const readiness = Object.values(draftStatus).filter(Boolean).length
  const totalSteps = Object.keys(draftStatus).length
  const progress = Math.round((readiness / totalSteps) * 100)

  if (createdCharacter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-600">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">สร้างสำเร็จ!</h1>
          <p className="mt-2 text-slate-400">
            ตัวละคร <span className="font-semibold text-white">{createdCharacter.name}</span> พร้อมใช้งานแล้ว
          </p>
          <button
            type="button"
            onClick={() => navigate(`/characters/${createdCharacter.id}`)}
            className="mt-8 w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500"
          >
            ดูตัวละคร
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">สตูดิโอสร้างสรรค์</h1>
              <p className="text-slate-400">สร้างตัวละคร AI ของคุณเอง</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300">ความคืบหน้า</span>
            <span className="text-sm font-bold text-purple-400">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`text-xs ${draftStatus.hasName ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ ชื่อ
            </span>
            <span className={`text-xs ${draftStatus.hasTagline ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ คำโปรย
            </span>
            <span className={`text-xs ${draftStatus.hasGreeting ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ ทักทาย
            </span>
            <span className={`text-xs ${draftStatus.hasPersona ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ บุคลิก
            </span>
            <span className={`text-xs ${draftStatus.hasScenario ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ สถานการณ์
            </span>
            <span className={`text-xs ${draftStatus.hasVisibility ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ การมองเห็น
            </span>
            <span className={`text-xs ${draftStatus.hasAvatar ? 'text-green-400' : 'text-slate-500'}`}>
              ✓ รูปภาพ
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Form Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
            <CharacterCreateForm
              isSaving={isSaving}
              onSubmit={handleCreate}
              onDraftStatusChange={setDraftStatus}
              onPreview={handlePreview}
            />
          </div>

          {/* Preview Section */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            {showPreview && characterData ? (
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 overflow-hidden">
                <div className="border-b border-slate-700 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">พรีวิวการสนทนา</h3>
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
                <div className="h-[600px]">
                  <PreviewChat
                    characterData={characterData}
                    onClose={() => setShowPreview(false)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
                <div className="text-center">
                  <Eye className="mx-auto h-12 w-12 text-slate-600" />
                  <h3 className="mt-4 font-semibold text-slate-300">พรีวิวการสนทนา</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    กรอกข้อมูลตัวละครแล้วคลิก "พรีวิว" เพื่อทดสอบการสนทนา
                  </p>
                  <button
                    type="button"
                    onClick={() => characterData && setShowPreview(true)}
                    disabled={!characterData}
                    className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                    title={!characterData ? 'กรุณากรอกข้อมูลตัวละครก่อนพรีวิว' : 'เปิดพรีวิวการสนทนา'}
                  >
                    <Play className="inline h-4 w-4 mr-2" />
                    เปิดพรีวิว
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
