import { Link } from 'react-router-dom'
import { Coins, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { savePersonaDraft, selectPersonaDraft } from '../store/slices/draftsSlice'
import { selectIsLowToken, selectTokenBalance } from '../store/slices/walletSlice'

const personaTemplate = [
  'ชื่อ:',
  'สรรพนาม:',
  'สไตล์โรลเพลย์:',
  'ขอบเขตที่ไม่ต้องการ:',
  'โทนที่ชอบ:',
  'สิ่งที่อยากให้ตัวละครจำ:',
].join('\n')

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isLowToken = useAppSelector(selectIsLowToken)
  const personaDraft = useAppSelector(selectPersonaDraft)
  const personaLength = personaDraft.trim().length

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
      <section className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">โปรไฟล์ / ตัวตนผู้เล่น</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              ข้อมูลนี้จะบันทึกอัตโนมัติในเครื่อง และแนบไปกับทุกแชทเพื่อให้ AI เข้าใจบริบทของคุณมากขึ้น
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">บันทึกอัตโนมัติ</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            onClick={() => dispatch(savePersonaDraft(personaDraft.trim() ? `${personaDraft}\n\n${personaTemplate}` : personaTemplate))}
            type="button"
          >
            ใส่แม่แบบ
          </button>
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            onClick={() => dispatch(savePersonaDraft(''))}
            type="button"
          >
            ล้างข้อมูล
          </button>
          <div className="flex min-h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-500">
            {personaLength.toLocaleString()} ตัวอักษร
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black text-slate-600">ข้อมูลตัวตน</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-lg border border-slate-900/10 p-4 text-sm leading-7 outline-none focus:border-blue-500"
            onChange={(event) => dispatch(savePersonaDraft(event.target.value))}
            placeholder="ชื่อ สรรพนาม บุคลิก บทบาท ขอบเขตที่ไม่ต้องการ..."
            value={personaDraft}
          />
        </label>
        <div className="mt-4 rounded-lg border border-blue-500/15 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          เขียนให้กระชับจะได้ผลดีที่สุด เน้นตัวตน สไตล์การเล่น และขอบเขตสำคัญ มากกว่าประวัติยาวๆ
        </div>
      </section>

      <aside className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-slate-500">ยอดโทเคน</p>
        <p className="mt-2 text-4xl font-black">{tokenBalance.toLocaleString()}</p>
        {isLowToken && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">โทเคนใกล้หมดแล้ว</p>}
        <div className="mt-5 space-y-2 text-sm text-slate-600">
          <p className="m-0 font-bold text-slate-900">หมายเหตุการใช้งาน</p>
          <p className="m-0">ระหว่าง AI กำลังตอบ ระบบจะกันการกดส่งซ้ำ</p>
          <p className="m-0">ข้อมูลตัวตนที่ยาวเกินไปจะใช้โทเคนมากขึ้น ควรเขียนให้ตรงประเด็น</p>
        </div>

        <div className="mt-5 border-t border-slate-900/10 pt-5">
          <p className="m-0 text-sm font-black text-slate-900">เครื่องมือบัญชี</p>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-black text-white transition hover:bg-amber-600"
            to="/wallet"
          >
            <Coins size={17} />
            การใช้โทเคน
          </Link>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            to="/moderation"
          >
            <ShieldCheck size={17} />
            คิวตรวจรายงาน
          </Link>
        </div>
      </aside>
    </div>
  )
}
