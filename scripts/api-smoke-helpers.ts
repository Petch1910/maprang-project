import { providerFailureHint } from './image-smoke'

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
