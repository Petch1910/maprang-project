import { isUuid } from './security'

export type RouteSet = {
  status?: number | string
}

export const routeErrorMessages: Record<string, string> = {
  chat_not_found: 'ไม่พบแชทนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
  database_not_configured: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
  invalid_character_id: 'รหัสตัวละครไม่ถูกต้อง',
  invalid_chat_id: 'รหัสแชทไม่ถูกต้อง',
  invalid_lore_id: 'รหัสคลังความรู้ไม่ถูกต้อง',
  invalid_parent_lore_id: 'รหัสคลังความรู้หลักไม่ถูกต้อง',
  invalid_report_id: 'รหัสรายงานไม่ถูกต้อง',
  invalid_user_id: 'รหัสผู้ใช้ไม่ถูกต้อง',
  invalid_id: 'รหัสที่ส่งมาไม่ถูกต้อง',
}

export function routeErrorMessage(error: string) {
  return routeErrorMessages[error] ?? routeErrorMessages.invalid_id
}

export function routeErrorResponse(error: string) {
  return { error, message: routeErrorMessage(error) }
}

export function rejectInvalidUuid(id: string, set: RouteSet, error = 'invalid_id') {
  if (isUuid(id)) return null
  set.status = 400
  return routeErrorResponse(error)
}
