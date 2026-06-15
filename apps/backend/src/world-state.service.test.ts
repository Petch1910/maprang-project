import { describe, expect, test } from 'bun:test'
import { buildWorldStatePrompt, coerceWorldState, mergeWorldState } from './world-state.service'

describe('world state prompt', () => {
  test('builds Thai-first runtime prompt labels for current scene state', () => {
    const worldState = mergeWorldState(null, {
      timeOfDay: 'หลังเที่ยงคืน',
      location: 'ดาดฟ้าฝนพรำ',
      weather: 'ฝนเบา',
      mood: 'ตึงเงียบแต่ยังอบอุ่น',
      sceneNotes: ['ผู้เล่นยังไม่ได้กดเข้าฉากสารภาพความรู้สึก'],
    })

    const prompt = buildWorldStatePrompt(worldState)

    expect(prompt).toContain('สถานะโลกปัจจุบัน:')
    expect(prompt).toContain('เวลา: หลังเที่ยงคืน')
    expect(prompt).toContain('สถานที่: ดาดฟ้าฝนพรำ')
    expect(prompt).toContain('สภาพอากาศ: ฝนเบา')
    expect(prompt).toContain('อารมณ์บรรยากาศ: ตึงเงียบแต่ยังอบอุ่น')
    expect(prompt).toContain('โน้ตฉาก: ผู้เล่นยังไม่ได้กดเข้าฉากสารภาพความรู้สึก')
    expect(prompt).toContain('ถือว่านี่คือสถานะโลกปัจจุบัน')
    expect(prompt).not.toContain('World state')
    expect(prompt).not.toContain('Time:')
    expect(prompt).not.toContain('Location:')
    expect(prompt).not.toContain('Scene notes:')
  })

  test('keeps world state sanitized and bounded before prompt injection', () => {
    const worldState = coerceWorldState({
      timeOfDay: '  ตอนเย็น    ใกล้ค่ำ  ',
      location: 'x'.repeat(160),
      weather: 123,
      mood: 'เงียบ\nนิ่ง',
      sceneNotes: Array.from({ length: 8 }, (_, index) => `โน้ต ${index + 1} ${'ย'.repeat(220)}`),
    })

    expect(worldState.timeOfDay).toBe('ตอนเย็น ใกล้ค่ำ')
    expect(worldState.location.length).toBeLessThanOrEqual(120)
    expect(worldState.weather).toBe('')
    expect(worldState.mood).toBe('เงียบ นิ่ง')
    expect(worldState.sceneNotes).toHaveLength(5)
    expect(worldState.sceneNotes.every((note) => note.length <= 300)).toBe(true)
  })
})
