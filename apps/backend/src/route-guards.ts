import { isUuid } from './security'

export type RouteSet = {
  status?: number | string
}

export const routeErrorMessages: Record<string, string> = {
  admin_unauthorized: 'กรุณาใช้สิทธิ์ผู้ดูแลเพื่อใช้งานส่วนนี้',
  admin_summary_unavailable: 'โหลดภาพรวมผู้ดูแลไม่สำเร็จ กรุณาตรวจสอบฐานข้อมูลแล้วลองใหม่',
  amount_must_be_integer: 'จำนวนโทเคนต้องเป็นเลขจำนวนเต็ม',
  amount_required: 'กรุณาระบุจำนวนโทเคนที่ต้องการปรับ',
  amount_too_large: 'จำนวนโทเคนที่ปรับมากเกินไป',
  character_create_failed: 'สร้างตัวละครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  character_forbidden: 'คุณไม่มีสิทธิ์จัดการตัวละครนี้',
  character_id_required: 'กรุณาระบุตัวละครที่ต้องการรายงาน',
  character_not_found: 'ไม่พบตัวละครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
  chat_not_found: 'ไม่พบแชทนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
  database_not_configured: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
  invalid_character_id: 'รหัสตัวละครไม่ถูกต้อง',
  invalid_chat_id: 'รหัสแชทไม่ถูกต้อง',
  invalid_lore_id: 'รหัสคลังความรู้ไม่ถูกต้อง',
  invalid_message_id: 'รหัสข้อความไม่ถูกต้อง',
  invalid_parent_lore_id: 'รหัสคลังความรู้หลักไม่ถูกต้อง',
  invalid_report_action: 'คำสั่งจัดการรายงานไม่ถูกต้อง',
  invalid_report_id: 'รหัสรายงานไม่ถูกต้อง',
  invalid_user_id: 'รหัสผู้ใช้ไม่ถูกต้อง',
  invalid_id: 'รหัสที่ส่งมาไม่ถูกต้อง',
  lore_create_failed: 'สร้างคลังความรู้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  lore_forbidden: 'คุณไม่มีสิทธิ์จัดการคลังความรู้ของตัวละครนี้',
  lore_not_found: 'ไม่พบคลังความรู้นี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
  insufficient_token_balance: 'ยอดโทเคนของผู้ใช้นี้ไม่พอสำหรับการปรับลด',
  local_eval_unavailable: 'รันชุดทดสอบคุณภาพในเครื่องไม่สำเร็จ',
  message_id_required: 'กรุณาระบุข้อความที่ต้องการรายงาน',
  message_not_found: 'ไม่พบข้อความนี้ หรือคุณไม่มีสิทธิ์รายงาน',
  message_report_required: 'รายงานนี้ไม่ได้ผูกกับข้อความ',
  reason_required: 'กรุณาระบุเหตุผลของรายงาน',
  report_create_failed: 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  report_not_found: 'ไม่พบรายงานนี้',
  character_report_required: 'รายงานนี้ไม่ได้ผูกกับตัวละคร',
  unauthorized: 'กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้',
  unknown_error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  user_not_found: 'ไม่พบผู้ใช้นี้',
}

export function routeErrorMessage(error: string) {
  return routeErrorMessages[error] ?? routeErrorMessages.unknown_error
}

export function routeErrorResponse(error: string) {
  return { error, message: routeErrorMessage(error) }
}

export function rejectInvalidUuid(id: string, set: RouteSet, error = 'invalid_id') {
  if (isUuid(id)) return null
  set.status = 400
  return routeErrorResponse(error)
}
