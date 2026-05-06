import { useAppDispatch, useAppSelector } from '../store/hooks'
import { saveContentSettings, selectContentSettings, setAdultStatus } from '../store/slices/contentSlice'

export function AgeGate() {
  const dispatch = useAppDispatch()
  const content = useAppSelector(selectContentSettings)
  if (content.ageGateAnswered) return null

  const chooseMode = (isAdult: boolean) => {
    dispatch(setAdultStatus(isAdult))
    dispatch(saveContentSettings({ isAdult, maxRating: isAdult ? 'restricted_18' : 'teen_romance' }))
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-white p-5 shadow-2xl">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase">ตั้งค่าคอนเทนต์</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">เลือกโหมดการใช้งาน</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Maprang รองรับโรลเพลย์ที่เน้นความสัมพันธ์และอีเวนต์เข้มข้น คอนเทนต์สำหรับผู้ใหญ่จะถูกซ่อนไว้จนกว่าจะยืนยันโหมดผู้ใหญ่
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-16 rounded-lg border border-slate-900/10 bg-slate-50 px-4 text-left transition hover:bg-white"
            onClick={() => chooseMode(false)}
            type="button"
          >
            <span className="block text-sm font-black text-slate-900">โหมดทั่วไป</span>
            <span className="mt-1 block text-xs font-bold text-slate-500">แสดงคอนเทนต์ทั่วไปและโรแมนซ์แบบเบาเท่านั้น</span>
          </button>
          <button
            className="min-h-16 rounded-lg bg-slate-950 px-4 text-left text-white transition hover:bg-slate-800"
            onClick={() => chooseMode(true)}
            type="button"
          >
            <span className="block text-sm font-black">โหมดผู้ใหญ่</span>
            <span className="mt-1 block text-xs font-bold text-white/70">เปิดการค้นพบคอนเทนต์สำหรับผู้ใหญ่ตามการตั้งค่า</span>
          </button>
        </div>
      </section>
    </div>
  )
}
