export const relationshipStatusLabels: Record<string, string> = {
  ACQUAINTANCE: 'คนรู้จัก',
  BICKERING_RIVAL: 'คู่กัด',
  CLOSE: 'ใกล้ชิด',
  CLOSE_FRIEND: 'เพื่อนสนิท',
  COMPLICATED: 'ซับซ้อน',
  CRUSH: 'แอบชอบ',
  DATING_TRIAL: 'ลองคุย',
  DEVOTED: 'ทุ่มเท',
  DISLIKED: 'ไม่ถูกกัน',
  ENEMY: 'ศัตรู',
  FAMILY: 'ครอบครัว',
  FRIEND: 'เพื่อน',
  FRIEND_CRUSH: 'เพื่อนสนิทคิดไม่ซื่อ',
  LIFE_PARTNER: 'คู่ชีวิต',
  LOVER: 'คนรัก',
  NEUTRAL: 'เป็นกลาง',
  PARTNER: 'แฟน',
  RIDE_OR_DIE: 'เพื่อนตาย',
  RIVAL: 'คู่ปรับ',
  ROMANTIC: 'โรแมนติก',
  SOULMATE: 'คู่แท้',
  SPOUSE: 'คู่ครอง',
  TALKING_STAGE: 'คนคุย',
  TOXIC_PARTNER: 'แฟน Toxic',
  TOXIC_SPOUSE: 'คู่ครอง Toxic',
  TRAUMA: 'ระแวง/บาดแผล',
  TRUSTED: 'ไว้ใจ',
}

export const relationshipTierLabels: Record<string, string> = {
  'breaking-negative': 'ใกล้แตกหัก',
  'breaking-positive': 'ผูกพันล้น',
  bonded: 'ผูกพัน',
  close: 'ใกล้ชิด',
  cold: 'ระยะห่าง',
  hostile: 'ตึงเครียด',
  intimate: 'ลึกซึ้ง',
  neutral: 'โหมดอิสระ',
  rival: 'แรงปะทะ',
  steady: 'คงที่',
  trusted: 'ไว้ใจ',
  volatile: 'ผันผวน',
  warm: 'อบอุ่น',
  warming: 'อบอุ่นขึ้น',
}

export function relationshipStatusLabel(status?: string) {
  if (!status) return 'เริ่มต้น'
  return relationshipStatusLabels[status] ?? status
}

export function relationshipTierLabel(tier?: string) {
  if (!tier) return 'โหมดอิสระ'
  return relationshipTierLabels[tier.toLowerCase()] ?? tier
}
