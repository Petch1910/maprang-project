import { Image as ImageIcon, ShieldCheck, Sparkles } from 'lucide-react'

import type { AiCreatorGeneratedItem } from '../../lib/aiCreator'

type AiCreatorPublicGalleryPanelProps = {
  privateItemCount: number
  publicItems?: AiCreatorGeneratedItem[]
  onOpenItem?: (item: AiCreatorGeneratedItem) => void
  onReuseItem?: (item: AiCreatorGeneratedItem) => void
  onCreateFocus: () => void
}

export function AiCreatorPublicGalleryPanel({
  privateItemCount,
  publicItems = [],
  onOpenItem,
  onReuseItem,
  onCreateFocus,
}: AiCreatorPublicGalleryPanelProps) {
  const hasItems = publicItems.length > 0

  return (
    <section className="missai-card mt-8 rounded-2xl p-6" data-testid="ai-creator-public-gallery">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#d8b4fe]">
            <ShieldCheck size={16} className="text-emerald-300" />
            Public Gallery
          </div>
          <h2 className="mt-2 text-lg font-black text-white">แกลเลอรีสาธารณะ</h2>
          <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/50">
            ผลงานที่ผู้ใช้เผยแพร่เพื่อแชร์ prompt และเป็นแรงบันดาลใจ (Opt-in)
          </p>
        </div>

        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">
          {privateItemCount} private item
        </span>
      </div>

      <div className="pt-6">
        {!hasItems ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <div>
              <ImageIcon className="mx-auto h-12 w-12 text-white/20" />
              <h3 className="mt-4 text-sm font-black text-white">ยังไม่มีผลงานสาธารณะ</h3>
              <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-white/45">
                เลือกชิ้นงานจาก My Library ของคุณแล้วกด "เผยแพร่สาธารณะ" เพื่อแชร์ผลงานของคุณให้โลกเห็น
              </p>
              <button
                type="button"
                data-testid="ai-creator-public-create-focus"
                onClick={onCreateFocus}
                className="missai-button-primary mx-auto mt-5 min-h-10 px-5 text-xs"
              >
                <Sparkles size={14} />
                สร้างชิ้นงานใหม่
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {publicItems.map((item) => (
              <article
                key={item.id}
                className="group rounded-xl border border-white/5 bg-[#0b0d1f]/60 overflow-hidden hover:border-emerald-400/75 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all duration-300 relative flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => onOpenItem?.(item)}
                  className="block w-full text-left"
                  title={`ดูรายละเอียด ${item.prompt}`}
                  aria-label={`ดูรายละเอียด ${item.prompt}`}
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-[#080a1a] relative">
                    <img
                      src={item.url}
                      alt={item.prompt}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-medium text-slate-300 line-clamp-2" title={item.prompt}>{item.prompt || 'ไม่มี prompt'}</p>
                  </div>
                </button>

                <div className="mt-auto grid grid-cols-2 gap-2 px-3 pb-3">
                  <button
                    type="button"
                    data-testid={`ai-creator-public-action-detail-${item.id}`}
                    onClick={() => onOpenItem?.(item)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    รายละเอียด
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-creator-public-action-reuse-${item.id}`}
                    onClick={() => onReuseItem?.(item)}
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
                  >
                    ใช้ซ้ำ
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
