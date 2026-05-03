import { useEffect, useState } from 'react'
// มั่นใจว่า path ตรงกับที่คุณใช้แล้วหายแดง (./src/lib/api หรือ ./lib/api)
import { api } from './lib/api' 

function App() {
  const [characters, setCharacters] = useState<any[]>([])

  useEffect(() => {
    // ดึงข้อมูลตัวละครจาก Backend ผ่าน Eden Treaty
    api.characters.get().then(({ data }: any) => { 
      if (data) setCharacters(data)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-slate-800 mb-10 text-center">
          Maprang Characters 🌸
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {characters.map((char) => (
            <div key={char.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all">
              <h2 className="text-2xl font-bold text-slate-700">{char.name}</h2>
              <p className="text-slate-500 mt-2 line-clamp-2">{char.description}</p>
              
              <div className="mt-6 flex items-center justify-between">
                <span className="px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
                  {char.visibility}
                </span>
                <button className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-bold hover:bg-orange-500 transition-colors">
                  แชทกับ {char.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* กรณีที่ยังไม่ได้รัน Seed หรือดึงข้อมูลไม่ได้[cite: 1] */}
        {characters.length === 0 && (
          <div className="text-center mt-20 p-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-xl font-medium">ยังไม่มีข้อมูลตัวละครในฐานข้อมูลครับ 😅</p>
            <p className="text-slate-400 mt-2 text-sm">ตรวจสอบว่ารัน Seed และเปิด Backend (พอร์ต 3000) แล้วหรือยัง</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App