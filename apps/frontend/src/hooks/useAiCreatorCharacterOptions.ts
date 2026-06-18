import { useEffect, useState } from 'react'
import { fetchCharacters, logUnexpectedError, type Character } from '../lib/api'

export function useAiCreatorCharacterOptions(limit = 40) {
  const [characters, setCharacters] = useState<Character[]>([])

  useEffect(() => {
    let active = true

    fetchCharacters({ view: 'public', limit })
      .then((res) => {
        if (active && res.characters) {
          setCharacters(res.characters)
        }
      })
      .catch((err) => {
        logUnexpectedError('ดึงข้อมูลรายชื่อตัวละครเพื่อสร้างภาพร่างล้มเหลว', err)
      })

    return () => {
      active = false
    }
  }, [limit])

  return characters
}
