import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ReportDialog, type ReportDialogSubmit } from '../components/ReportDialog'
import {
  createReport,
  fetchCharacter,
  fetchRelationshipPresets,
  logUnexpectedError,
  type Character,
  type RelationshipPreset,
} from '../lib/api'
import { displayCharacterDetail } from '../lib/characterDisplay'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadExploreCharacters, selectExploreCharacters } from '../store/slices/charactersSlice'
import { saveContentSettings, selectContentSettings, setAdultStatus } from '../store/slices/contentSlice'

type RelationshipContractSeed = {
  id: string
  label: string
  tone: string
  color: string
}

const fallbackRelationshipSeeds: RelationshipContractSeed[] = [
  { id: 'stranger', label: 'คนแปลกหน้า', tone: 'ยังไม่รู้จักกัน ระวังตัวแต่มีพื้นที่ให้เริ่มใหม่', color: 'bg-blue-600' },
  { id: 'enemy', label: 'ศัตรู', tone: 'แรงต้านสูง ไม่ไว้ใจ และพร้อมปะทะ', color: 'bg-red-700' },
  { id: 'disliked', label: 'ไม่ถูกกัน', tone: 'ไม่ถึงขั้นศัตรู แต่มีอคติและความติดขัด', color: 'bg-orange-700' },
  { id: 'rival', label: 'คู่ปรับ', tone: 'แข่งขัน คม และมีแรงปะทะทางอารมณ์', color: 'bg-rose-600' },
  { id: 'bickering-rival', label: 'คู่กัด', tone: 'กัดกันด้วยคำพูด มี push-pull และจังหวะหยอกแรง', color: 'bg-pink-700' },
  { id: 'acquaintance', label: 'คนรู้จัก', tone: 'คุ้นหน้าแต่ยังไม่สนิท ต้องค่อย ๆ เปิดบทสนทนา', color: 'bg-slate-600' },
  { id: 'friend', label: 'เพื่อน', tone: 'เป็นมิตร คุยง่าย และไว้ใจกันระดับหนึ่ง', color: 'bg-sky-600' },
  { id: 'close-friend', label: 'เพื่อนสนิท', tone: 'สบายใจ อบอุ่น และมีพื้นที่ปลอดภัย', color: 'bg-emerald-600' },
  { id: 'ride-or-die', label: 'เพื่อนตาย', tone: 'ไว้ใจกันลึก ผ่านอะไรด้วยกัน และพร้อมยืนข้างกัน', color: 'bg-teal-700' },
  { id: 'crush', label: 'แอบชอบ', tone: 'ละมุน เขิน และมีแรงดึงดูดที่ยังไม่กล้าพูดตรง ๆ', color: 'bg-fuchsia-600' },
  { id: 'friend-crush', label: 'เพื่อนสนิทคิดไม่ซื่อ', tone: 'สนิทแบบเดิม แต่มีความรู้สึกเกินเพื่อนซ่อนอยู่', color: 'bg-violet-700' },
  { id: 'dating-trial', label: 'ลองคุย', tone: 'กำลังเปิดใจ ยังไม่ผูกมัดและยังวัดใจกัน', color: 'bg-indigo-600' },
  { id: 'talking-stage', label: 'คนคุย', tone: 'ใกล้กว่าแค่ลองคุย มีความคาดหวังและเคมีชัดขึ้น', color: 'bg-purple-700' },
  { id: 'partner', label: 'แฟน', tone: 'เป็นความสัมพันธ์แล้ว มีความใกล้ชิดและข้อตกลงร่วมกัน', color: 'bg-rose-700' },
  { id: 'toxic-partner', label: 'แฟน Toxic', tone: 'ดึงดูดสูงแต่ trust ต่ำ ตึงและต้องค่อย ๆ ซ่อมความไว้ใจ', color: 'bg-red-800' },
  { id: 'lover', label: 'คนรัก', tone: 'รักชัดเจน อบอุ่น และพร้อมเข้าสู่ฉากสำคัญ', color: 'bg-pink-600' },
  { id: 'life-partner', label: 'คู่ชีวิต', tone: 'ผูกพันระยะยาว เชื่อใจกันสูง และมีเป้าหมายร่วมกัน', color: 'bg-emerald-700' },
  { id: 'spouse', label: 'คู่ครอง', tone: 'ผูกมัด มีประวัติร่วมกัน และมีความรับผิดชอบร่วมกัน', color: 'bg-cyan-700' },
  { id: 'toxic-spouse', label: 'คู่ครอง Toxic', tone: 'ผูกมัดแต่มีแรงกดดันสูง ต้องคุมโทนให้เห็นรอยร้าว', color: 'bg-stone-700' },
  { id: 'soulmate', label: 'คู่แท้', tone: 'ผูกพันลึก เหมือนเข้าใจกันโดยธรรมชาติ แต่ยังเล่นต่อได้', color: 'bg-amber-600' },
]

const seedColorById = new Map(fallbackRelationshipSeeds.map((seed) => [seed.id, seed.color]))

function contractSeedsFromPresets(presets: RelationshipPreset[]) {
  if (presets.length === 0) return fallbackRelationshipSeeds
  return [
    fallbackRelationshipSeeds[0],
    ...presets.map((preset) => ({
      id: preset.id,
      label: preset.name,
      tone: preset.description,
      color: seedColorById.get(preset.id) ?? 'bg-slate-600',
    })),
  ]
}

export function CharacterLobbyPage() {
  const dispatch = useAppDispatch()
  const { characterId } = useParams()
  const characters = useAppSelector(selectExploreCharacters)
  const content = useAppSelector(selectContentSettings)
  const [contractSeeds, setContractSeeds] = useState<RelationshipContractSeed[]>(fallbackRelationshipSeeds)
  const [selectedSeedId, setSelectedSeedId] = useState(fallbackRelationshipSeeds[0].id)
  const [isPresetLoading, setIsPresetLoading] = useState(true)
  const [presetError, setPresetError] = useState('')
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportNote, setReportNote] = useState('')
  const character = useMemo(
    () => (detailCharacter?.id === characterId ? detailCharacter : (characters.find((item) => item.id === characterId) ?? null)),
    [characterId, characters, detailCharacter],
  )

  useEffect(() => {
    if (characters.length === 0) dispatch(loadExploreCharacters({ maxRating: content.maxRating }))
  }, [characters.length, content.maxRating, dispatch])

  useEffect(() => {
    let cancelled = false
    setIsPresetLoading(true)
    setPresetError('')
    fetchRelationshipPresets('contract')
      .then((data) => {
        if (cancelled) return
        setContractSeeds(contractSeedsFromPresets(data.presets))
      })
      .catch((error) => {
        if (cancelled) return
        setPresetError('ใช้รายการความสัมพันธ์สำรองในเครื่องอยู่')
        logUnexpectedError('โหลดชุดความสัมพันธ์เริ่มต้นไม่สำเร็จ:', error)
      })
      .finally(() => {
        if (!cancelled) setIsPresetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!characterId) return
    let cancelled = false
    setIsLoadingDetail(true)
    setDetailError('')
    fetchCharacter(characterId)
      .then((data) => {
        if (cancelled) return
        setDetailCharacter(data.character)
      })
      .catch(() => {
        if (cancelled) return
        setDetailCharacter(null)
        setDetailError('ไม่พบตัวละครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [characterId])
  const rating = character ? characterRating(character) : 'general'
  const canView = canViewRating(rating, content.maxRating)
  const canStartChat = Boolean(character) && canView
  const seed = contractSeeds.find((item) => item.id === selectedSeedId) ?? contractSeeds[0] ?? fallbackRelationshipSeeds[0]

  const reportCharacter = async ({ reason, details }: ReportDialogSubmit) => {
    if (!character || isReporting) return
    setIsReporting(true)
    setReportNote('')
    try {
      await createReport({
        targetType: 'CHARACTER',
        characterId: character.id,
        reason,
        details: details || `รายงานจากหน้าโปรไฟล์ตัวละคร ระดับเนื้อหา: ${ratingLabel(rating)}.`,
        metadata: {
          contentRating: rating,
          tags: character.tags,
        },
      })
      setReportNote('ส่งรายงานให้ผู้ดูแลตรวจแล้ว')
      setIsReportDialogOpen(false)
    } catch {
      setReportNote('ส่งรายงานไม่ได้ กรุณาลองใหม่')
    } finally {
      setIsReporting(false)
    }
  }
  const shareCharacter = async () => {
    if (!character) return
    const url = `${window.location.origin}/characters/${character.id}`
    const copied = await safeWriteClipboardText(getSafeClipboard(), url)
    setReportNote(copied ? 'คัดลอกลิงก์ตัวละครแล้ว' : `คัดลอกลิงก์นี้: ${url}`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151519] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.28),transparent_32%),radial-gradient(circle_at_75%_0%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,#19191f,#101014)] sm:h-60">
          {character?.avatarUrl && (
            <>
              <img alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" src={character.avatarUrl} />
              <div className="absolute inset-0 bg-black/62" />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[#151519] to-transparent" />
        </div>
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-8">
          <div className="-mt-20 space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border-4 border-[#151519] bg-[#22222a] shadow-[0_24px_64px_rgba(0,0,0,0.38)] ring-1 ring-white/10">
              {character?.avatarUrl ? (
                <img alt={`รูปตัวละคร ${character.name}`} className="h-full w-full object-cover" src={character.avatarUrl} />
              ) : (
                <div className="grid h-full place-items-center p-5 text-center text-sm font-black text-white/35">
                  รูปตัวละคร
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/6 font-black text-white/78 transition hover:bg-white/10 disabled:opacity-60"
                data-testid="character-report-button"
                disabled={isReporting || !character}
                onClick={() => setIsReportDialogOpen(true)}
                type="button"
              >
                รายงาน
              </button>
              <button
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/6 font-black text-white/78 transition hover:bg-white/10 disabled:opacity-60"
                data-testid="character-share-button"
                disabled={!character}
                onClick={shareCharacter}
                type="button"
              >
                แชร์
              </button>
            </div>
            {reportNote && (
              <p className="m-0 rounded-xl border border-white/10 bg-white/6 p-3 text-xs font-bold text-white/62" data-testid="character-action-note">
                {reportNote}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {isLoadingDetail && !character && (
              <section className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm font-bold text-white/62">
                กำลังโหลดโปรไฟล์ตัวละคร...
              </section>
            )}
            {detailError && !character && (
              <section className="rounded-2xl border border-rose-400/20 bg-rose-500/12 p-4 text-rose-100">
                <h2 className="text-lg font-black">เปิดตัวละครนี้ไม่ได้</h2>
                <p className="mt-1 text-sm leading-6 text-rose-100/70">{detailError}</p>
                <Link className="mt-3 inline-flex min-h-10 items-center rounded-full bg-rose-500 px-4 text-sm font-black text-white" to="/">
                  กลับไปหน้าสำรวจ
                </Link>
              </section>
            )}
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-orange-300/75 uppercase">ล็อบบี้ตัวละคร</p>
              <h1 className="mt-2 text-3xl font-black text-white">{character?.name ?? 'ตัวละคร'}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                {character ? displayCharacterDetail(character) : 'เลือกสัญญาความสัมพันธ์ก่อนเริ่มเส้นทางนี้'}
              </p>
              <p className="mt-2 text-xs font-bold text-white/35">รหัสตัวละคร: {characterId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-300/14 px-2.5 py-1 text-xs font-black text-amber-100">
                  {ratingLabel(rating)}
                </span>
                {(character?.tags ?? []).map((tag) => (
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-black text-white/62" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {!canView && (
              <section className="rounded-2xl border border-amber-300/30 bg-amber-300/12 p-4 text-amber-50">
                <h2 className="text-lg font-black">ต้องเปิดโหมดผู้ใหญ่</h2>
                <p className="mt-1 text-sm leading-6 text-amber-50/72">
                  ตัวละครนี้อยู่ในระดับ {ratingLabel(rating)} เปิดโหมดผู้ใหญ่ก่อนเริ่มเส้นทางนี้
                </p>
                <button
                  className="mt-3 min-h-10 rounded-full bg-amber-300 px-4 text-sm font-black text-amber-950"
                  onClick={() => {
                    dispatch(setAdultStatus(true))
                    dispatch(saveContentSettings({ isAdult: true, maxRating: 'restricted_18' }))
                  }}
                  type="button"
                >
                  เปิดโหมดผู้ใหญ่
                </button>
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/6 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h2 className="text-lg font-black text-white">สัญญาความสัมพันธ์</h2>
              <p className="mt-1 text-sm text-white/52">เลือกจุดเริ่มต้นทางอารมณ์ก่อนส่งข้อความแรก</p>
              {(isPresetLoading || presetError) && (
                <p className="mt-2 text-xs font-bold text-white/40">
                  {isPresetLoading ? 'กำลังเชื่อมรายการความสัมพันธ์จากระบบ...' : presetError}
                </p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {contractSeeds.map((item) => (
                  <button
                    aria-pressed={seed.id === item.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      seed.id === item.id
                        ? 'border-orange-400 bg-orange-500/14 shadow-[0_18px_42px_rgba(249,115,22,0.12)]'
                        : 'border-white/10 bg-[#202026] hover:border-white/18 hover:bg-white/8'
                    }`}
                    data-testid={`character-seed-${item.id}`}
                    key={item.id}
                    onClick={() => setSelectedSeedId(item.id)}
                    type="button"
                  >
                    <p className="font-black text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-white/58">{item.tone}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/22 p-4">
                <p className="text-sm font-black text-white/45">ตัวอย่างโทนอารมณ์</p>
                <p className="mt-1 text-lg font-black text-white">{seed.tone}</p>
              </div>
            </section>

            {canStartChat && character ? (
              <Link
                className={`block min-h-12 rounded-2xl px-5 py-3 text-center font-black text-white shadow-[0_18px_46px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 ${seed.color}`}
                data-testid="character-start-chat"
                to={`/chat?characterId=${character.id}&relationship_seed=${seed.id}`}
              >
                เริ่มแชทในฐานะ {seed.label}
              </Link>
            ) : (
              <button
                className="block min-h-12 w-full rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white/35 disabled:cursor-not-allowed"
                data-testid="character-start-chat-disabled"
                disabled
                type="button"
              >
                เริ่มแชท
              </button>
            )}
          </div>
        </div>
      </div>
      <ReportDialog
        isOpen={isReportDialogOpen}
        isSubmitting={isReporting}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={reportCharacter}
        target={
          character
            ? {
                targetType: 'CHARACTER',
                title: character.name,
                preview: displayCharacterDetail(character),
              }
            : null
        }
      />
    </div>
  )
}
