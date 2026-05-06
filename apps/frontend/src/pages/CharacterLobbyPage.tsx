import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ReportDialog, type ReportDialogSubmit } from '../components/ReportDialog'
import { createReport } from '../lib/api'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadExploreCharacters, selectExploreCharacters } from '../store/slices/charactersSlice'
import { selectContentSettings, setAdultStatus } from '../store/slices/contentSlice'

const seeds = [
  { id: 'stranger', label: 'Stranger', tone: 'Cautious but open', color: 'bg-blue-600' },
  { id: 'ally', label: 'Trusted Ally', tone: 'Warm, familiar, cooperative', color: 'bg-emerald-600' },
  { id: 'rival', label: 'Rival', tone: 'Sharp, tense, emotionally charged', color: 'bg-rose-600' },
  { id: 'crush', label: 'Secret Crush', tone: 'Soft tension, shy affection', color: 'bg-fuchsia-600' },
]

export function CharacterLobbyPage() {
  const dispatch = useAppDispatch()
  const { characterId } = useParams()
  const characters = useAppSelector(selectExploreCharacters)
  const content = useAppSelector(selectContentSettings)
  const [seed, setSeed] = useState(seeds[0])
  const [isReporting, setIsReporting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportNote, setReportNote] = useState('')
  const character = useMemo(
    () => characters.find((item) => item.id === characterId) ?? characters[0] ?? null,
    [characterId, characters],
  )

  useEffect(() => {
    if (characters.length === 0) dispatch(loadExploreCharacters({ maxRating: content.maxRating }))
  }, [characters.length, content.maxRating, dispatch])
  const rating = character ? characterRating(character) : 'general'
  const canView = canViewRating(rating, content.maxRating)

  const reportCharacter = async ({ reason, details }: ReportDialogSubmit) => {
    if (!character || isReporting) return
    setIsReporting(true)
    setReportNote('')
    try {
      await createReport({
        targetType: 'CHARACTER',
        characterId: character.id,
        reason,
        details: details || `Reported from Character Lobby. Rating: ${ratingLabel(rating)}.`,
        metadata: {
          contentRating: rating,
          tags: character.tags,
        },
      })
      setReportNote('Report submitted for review.')
      setIsReportDialogOpen(false)
    } catch {
      setReportNote('Could not submit report. Please try again.')
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-sm">
        <div className="h-40 bg-linear-to-br from-blue-200 via-fuchsia-100 to-amber-100 sm:h-60" />
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-8">
          <div className="-mt-20 space-y-4">
            <div className="aspect-square rounded-3xl border-4 border-white bg-linear-to-br from-slate-200 to-blue-100 shadow-xl" />
            <div className="flex gap-2">
              <button
                className="min-h-11 flex-1 rounded-xl border border-slate-900/10 bg-white font-black text-slate-700 disabled:opacity-60"
                disabled={isReporting || !character}
                onClick={() => setIsReportDialogOpen(true)}
                type="button"
              >
                Report
              </button>
              <button className="min-h-11 flex-1 rounded-xl border border-slate-900/10 bg-white font-black text-slate-700" type="button">
                Share
              </button>
            </div>
            {reportNote && <p className="m-0 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{reportNote}</p>}
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">Character Lobby</p>
              <h1 className="mt-2 text-3xl font-black">{character?.name ?? 'Character'}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {character?.biography ||
                  character?.description ||
                  'Choose a relationship contract before starting this route.'}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">Character ID: {characterId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                  {ratingLabel(rating)}
                </span>
                {(character?.tags ?? []).map((tag) => (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {!canView && (
              <section className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950">
                <h2 className="text-lg font-black">Adult mode required</h2>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  This character is rated {ratingLabel(rating)}. Switch to adult mode to start this route.
                </p>
                <button
                  className="mt-3 min-h-10 rounded-full bg-amber-900 px-4 text-sm font-black text-white"
                  onClick={() => dispatch(setAdultStatus(true))}
                  type="button"
                >
                  Enable adult mode
                </button>
              </section>
            )}

            <section className="rounded-2xl border border-slate-900/10 bg-slate-50 p-4">
              <h2 className="text-lg font-black">Relationship Contract</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the starting emotional route before the first message.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {seeds.map((item) => (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${
                      seed.id === item.id ? 'border-blue-500 bg-white shadow-md' : 'border-slate-900/10 bg-white/60'
                    }`}
                    key={item.id}
                    onClick={() => setSeed(item)}
                    type="button"
                  >
                    <p className="font-black">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.tone}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-slate-500">Preview mood</p>
                <p className="mt-1 text-lg font-black">{seed.tone}</p>
              </div>
            </section>

            <Link
              aria-disabled={!canView}
              className={`block min-h-12 rounded-2xl px-5 py-3 text-center font-black text-white ${canView ? seed.color : 'pointer-events-none bg-slate-300 text-slate-500'}`}
              to={`/chat?characterId=${characterId}&relationship_seed=${seed.id}`}
            >
              Start chat as {seed.label}
            </Link>
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
                preview: character.biography || character.description || character.tagline || undefined,
              }
            : null
        }
      />
    </div>
  )
}
