import { ShieldAlert } from 'lucide-react'
import type { AiCreatorGenerateBlockState } from '../../lib/aiCreator'

type AiCreatorBlockedStateMatrixProps = {
  states: AiCreatorGenerateBlockState[]
}

export function AiCreatorBlockedStateMatrix({ states }: AiCreatorBlockedStateMatrixProps) {
  return (
    <section className="missai-card mt-8 rounded-3xl p-5">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-200">
              <ShieldAlert size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white">ตารางตรวจ Generate Blocked States</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                ใช้ตรวจว่าแต่ละกรณีถูกบล็อกพร้อมเหตุผลและไม่หักเครดิตก่อน backend รับงาน
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-300">
            {states.length} สถานะ
          </span>
        </summary>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-y-2 text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">ข้อความผู้ใช้</th>
                <th className="px-3 py-2">สาเหตุ</th>
                <th className="px-3 py-2">ทางแก้ถัดไป</th>
                <th className="px-3 py-2 text-right">หักเครดิต</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.code} className="rounded-2xl bg-black/20 align-top text-slate-300">
                  <td className="rounded-l-2xl border-y border-l border-white/10 px-3 py-3 font-mono text-[10px] text-amber-200">
                    {state.code}
                  </td>
                  <td className="border-y border-white/10 px-3 py-3 font-semibold text-white">{state.title}</td>
                  <td className="border-y border-white/10 px-3 py-3 leading-relaxed text-slate-400">{state.cause}</td>
                  <td className="border-y border-white/10 px-3 py-3 leading-relaxed text-slate-300">{state.nextAction}</td>
                  <td className="rounded-r-2xl border-y border-r border-white/10 px-3 py-3 text-right font-bold text-emerald-300">
                    {state.debitAllowed ? 'อนุญาต' : 'ไม่หัก'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
