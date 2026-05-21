import { providerFailureHint } from './image-smoke'
import { formatDiagnosticText } from './smoke-helpers'

const machineReadableErrorCodePattern = /^[a-z][a-z0-9_]{0,79}$/

export function isMachineReadableErrorCode(value: unknown) {
  return typeof value === 'string' && machineReadableErrorCodePattern.test(value)
}

export function assertMachineReadableErrorCode(payload: { error?: unknown }, label = 'error ที่คาดไว้') {
  if (!isMachineReadableErrorCode(payload.error)) {
    const received = typeof payload.error === 'string' ? payload.error.slice(0, 120) : typeof payload.error
    throw new Error(`${label} ต้องคืน error code แบบ machine-readable snake_case แต่ได้ ${received || 'ไม่มีค่า'}`)
  }
}

export function creatorImageIssue(payload: { image?: { note?: string }; warnings?: string[] }) {
  const warnings = payload.warnings?.filter(Boolean).join('; ')
  const issue = warnings || payload.image?.note || 'ผู้ให้บริการสร้างรูปไม่ได้คืนรูปที่สร้างเสร็จแล้ว'
  return `${issue}${providerFailureHint(issue)}`
}

export function isOnlyLiveVerificationFailure(failures: string[]) {
  return (
    failures.length > 0 &&
    failures.every((failure) => {
      const normalized = failure.toLowerCase()
      return (
        normalized.includes('chat provider live smoke has not been verified') ||
        normalized.includes('image generation live smoke has not been verified') ||
        normalized.includes('live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน') ||
        normalized.includes('live smoke ของระบบสร้างรูปยังไม่ได้ยืนยันผ่าน') ||
        normalized.includes('live smoke ของผู้ให้บริการแชทยังไม่ผ่านการยืนยัน') ||
        normalized.includes('live smoke ของระบบสร้างรูปยังไม่ผ่านการยืนยัน') ||
        normalized.includes('live smoke ของ chat provider ยังไม่ผ่านการยืนยัน') ||
        normalized.includes('live smoke ของ image generation ยังไม่ผ่านการยืนยัน')
      )
    })
  )
}

export function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function formatApiSmokeDiagnostic(value: string, maxLength = 500, emptyLabel = 'response ว่าง') {
  return formatDiagnosticText(value, maxLength) || emptyLabel
}

export function parseApiSmokeStreamEvents<T = unknown>(raw: string, path = '/chat/stream') {
  const events: T[] = []

  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.startsWith('data: ')) return

    const eventBody = line.slice('data: '.length)
    const parsed = tryParseJson(eventBody)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`${path} คืน data event ที่ไม่ใช่ JSON ที่บรรทัด ${index + 1}: ${eventBody.slice(0, 200) || 'response ว่าง'}`)
    }

    events.push(parsed as T)
  })

  if (events.length === 0) throw new Error(`${path} ไม่คืน SSE data event`)
  return events
}
