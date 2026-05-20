export const characterStatusOptions = ['DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const
export const characterVisibilityOptions = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const

export const characterStatusLabels: Record<(typeof characterStatusOptions)[number], string> = {
  DRAFT: 'ดราฟต์',
  REVIEW: 'รอตรวจ',
  PUBLISHED: 'เผยแพร่แล้ว',
  REJECTED: 'ถูกปฏิเสธ',
  ARCHIVED: 'เก็บแล้ว',
}

export const characterVisibilityLabels: Record<(typeof characterVisibilityOptions)[number], string> = {
  PUBLIC: 'สาธารณะ',
  UNLISTED: 'ซ่อนจากหน้าสำรวจ',
  PRIVATE: 'ส่วนตัว',
}

export function characterStatusLabel(status?: string | null, fallback = 'ไม่ทราบ') {
  if (!status) return fallback
  return characterStatusLabels[status as (typeof characterStatusOptions)[number]] ?? status
}

export function characterVisibilityLabel(visibility?: string | null, fallback = 'ไม่ทราบ') {
  if (!visibility) return fallback
  return characterVisibilityLabels[visibility as (typeof characterVisibilityOptions)[number]] ?? visibility
}
