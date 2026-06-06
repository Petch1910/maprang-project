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
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-[#18181d]/96 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.52)]">
        <p className="text-xs font-black tracking-widest text-white/42 uppercase">ตั้งค่าคอนเทนต์</p>
        <h2 className="mt-2 text-2xl font-black text-white">เลือกโหมดการใช้งาน</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-white/58">
          Maprang รองรับโรลเพลย์ที่เน้นความสัมพันธ์และอีเวนต์เข้มข้น คอนเทนต์สำหรับผู้ใหญ่จะถูกซ่อนไว้จนกว่าจะยืนยันโหมดผู้ใหญ่
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-16 rounded-lg border border-white/10 bg-white/7 px-4 text-left transition hover:bg-white/10"
            onClick={() => chooseMode(false)}
            type="button"
          >
            <span className="block text-sm font-black text-white">โหมดทั่วไป</span>
            <span className="mt-1 block text-xs font-bold text-white/52">แสดงคอนเทนต์ทั่วไปและโรแมนซ์แบบเบาเท่านั้น</span>
          </button>
          <button
            className="min-h-16 rounded-lg bg-orange-500 px-4 text-left text-white transition hover:bg-orange-400"
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
