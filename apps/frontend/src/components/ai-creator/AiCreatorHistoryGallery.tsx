import { ChevronLeft, ChevronRight, Star, Video } from 'lucide-react'
import {
  AI_CREATOR_GALLERY_FILTERS,
  type AiCreatorGalleryFilter,
  type AiCreatorGeneratedItem,
} from '../../lib/aiCreator'

type AiCreatorHistoryGalleryProps = {
  historyCount: number
  filteredCount: number
  items: AiCreatorGeneratedItem[]
  galleryFilter: AiCreatorGalleryFilter
  currentPage: number
  totalPages: number
  onFilterChange: (filter: AiCreatorGalleryFilter) => void
  onPageChange: (page: number) => void
  onOpenItem: (item: AiCreatorGeneratedItem) => void
  onReuseItem: (item: AiCreatorGeneratedItem) => void
  onUseAsCharacterImage: (item: AiCreatorGeneratedItem) => void
  onToggleFavorite: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onClearHistory: () => void
}

export function AiCreatorHistoryGallery({
  historyCount,
  filteredCount,
  items,
  galleryFilter,
  currentPage,
  totalPages,
  onFilterChange,
  onPageChange,
  onOpenItem,
  onReuseItem,
  onUseAsCharacterImage,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
}: AiCreatorHistoryGalleryProps) {
  return (
    <section
      className="mt-8 rounded-2xl bg-[#1e1e34]/90 border border-[#2e2e44] p-6 shadow-2xl backdrop-blur-md"
      data-testid="ai-creator-library"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2e2e44] pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            แกลเลอรีประวัติภาพร่างและชิ้นงานจำลองระบบ
          </h2>
          <p className="text-xs font-medium text-[#6b7280] mt-1">
            แสดงภาพถ่ายและโครงร่างวิดีโอเคลื่อนไหวที่ประมวลผลเสร็จสิ้น (ดึงข้อมูลจำกัดหน้าต่างละ 12 รายการ)
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#18182f] p-1.5 rounded-xl border border-[#2e2e44]">
          {AI_CREATOR_GALLERY_FILTERS.map((filter) => (
            <button
              key={filter.val}
              type="button"
              onClick={() => onFilterChange(filter.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                galleryFilter === filter.val
                  ? 'bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] text-white shadow-lg missai-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`ตัวกรอง ${filter.label}`}
              aria-label={`ตัวกรอง ${filter.label}`}
              aria-pressed={galleryFilter === filter.val}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {historyCount > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all"
          >
            ล้างประวัติทั้งหมด
          </button>
        )}
      </div>

      {filteredCount === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs font-semibold" data-testid="ai-creator-library-empty">
          ไม่มีรายการแกลเลอรีในหมวดนี้ในประวัติคอมพิวเตอร์ของคุณ
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                data-testid="ai-creator-library-item"
                className="group rounded-xl border border-white/5 bg-[#0b0d1f]/60 overflow-hidden hover:border-[#ac4bff]/75 hover:shadow-[0_0_15px_rgba(172,75,255,0.2)] transition-all duration-300 relative"
              >
                <button
                  type="button"
                  data-testid={`ai-creator-library-open-${item.id}`}
                  onClick={() => onOpenItem(item)}
                  className="block w-full text-left"
                  title={`ดูรายละเอียด ${item.response.draft.name}`}
                  aria-label={`ดูรายละเอียด ${item.response.draft.name}`}
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-[#080a1a] relative">
                    <img
                      src={item.url}
                      alt={item.response.draft.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {item.type === 'video' && (
                      <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#080a1a]/85 border border-white/10 text-white shadow-lg flex items-center justify-center">
                        <Video size={12} className="text-[#ac4bff]" />
                      </div>
                    )}
                    {item.isFavorite && (
                      <div className="absolute left-2.5 top-2.5 rounded-lg border border-amber-300/40 bg-black/60 p-1.5 text-amber-200 shadow-lg">
                        <Star size={12} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-white truncate">{item.response.draft.name}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate mt-1">{item.prompt}</p>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <button
                    type="button"
                    data-testid={`ai-creator-library-detail-${item.id}`}
                    onClick={() => onOpenItem(item)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    title="เปิดรายละเอียดชิ้นงานนี้"
                    aria-label="เปิดรายละเอียดชิ้นงานนี้"
                  >
                    รายละเอียด
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-creator-library-favorite-${item.id}`}
                    onClick={() => onToggleFavorite(item.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                      item.isFavorite
                        ? 'border-amber-300/30 bg-amber-300/15 text-amber-200 hover:bg-amber-300/20'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={item.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มเข้ารายการโปรด'}
                    aria-label={item.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มเข้ารายการโปรด'}
                    aria-pressed={item.isFavorite === true}
                  >
                    {item.isFavorite ? 'ติดดาวแล้ว' : 'ติดดาว'}
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-creator-library-reuse-${item.id}`}
                    onClick={() => onReuseItem(item)}
                    className="rounded-lg border border-[#ac4bff]/30 bg-[#ac4bff]/10 px-2 py-1.5 text-[10px] font-semibold text-[#d9b3ff] transition hover:bg-[#ac4bff]/20"
                    title="ใช้ prompt และผลลัพธ์นี้ต่อ"
                    aria-label="ใช้ prompt และผลลัพธ์นี้ต่อ"
                  >
                    ใช้ซ้ำ
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-creator-library-use-image-${item.id}`}
                    onClick={() => onUseAsCharacterImage(item)}
                    className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
                    title="ส่งรูปนี้ไปใช้ในหน้าสร้างตัวละคร"
                    aria-label="ส่งรูปนี้ไปใช้ในหน้าสร้างตัวละคร"
                  >
                    ใช้รูปนี้
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-creator-library-delete-${item.id}`}
                    onClick={() => onDeleteItem(item.id)}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                    title={item.librarySource === 'backend' ? 'ลบชิ้นงานนี้จาก backend library ของฉัน' : 'ลบชิ้นงานนี้จากคลังของฉัน'}
                    aria-label={item.librarySource === 'backend' ? 'ลบชิ้นงานนี้จาก backend library ของฉัน' : 'ลบชิ้นงานนี้จากคลังของฉัน'}
                  >
                    ลบ
                  </button>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                title="หน้าก่อนหน้า"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-400">
                หน้า {currentPage} จากทั้งหมด {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                title="หน้าถัดไป"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
