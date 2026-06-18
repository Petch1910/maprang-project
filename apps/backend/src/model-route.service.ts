export const replyProfileRegistry = {
  quick: {
    label: 'เร็วและกระชับ',
    directives: [
      'ตอบสั้นเมื่อผู้ใช้ต้องการจังหวะเร็วหรือถามข้อมูลตรง',
      'ยังต้องคงบุคลิกตัวละครและไม่ตัดฉากจนเสียบริบท',
    ],
  },
  balanced: {
    label: 'สมดุลสำหรับแชทปกติ',
    directives: [
      'ตอบเป็นธรรมชาติ มีการกระทำ ความรู้สึกย่อย และ hook ให้ผู้เล่นตอบต่อ',
      'เหมาะกับ sandbox roleplay ที่ยังไม่เข้าสู่ฉากสำคัญ',
    ],
  },
  deep_roleplay: {
    label: 'ลึกสำหรับโรลเพลย์',
    directives: [
      'เพิ่ม subtext ความต่อเนื่องทางอารมณ์ และผลของความสัมพันธ์ล่าสุด',
      'หลีกเลี่ยงคำตอบตื้นหรือจบด้วยคำถามเดี่ยวโดยไม่มีการกระทำใหม่',
    ],
  },
  cinematic_scene: {
    label: 'ฉากแบบ cinematic',
    directives: [
      'เน้นบรรยากาศ เป้าหมายฉาก จังหวะการเปิดเผย และเงื่อนไขออกจากฉาก',
      'ใช้เมื่อ active scene ต้องการความเข้มและความต่อเนื่องสูง',
    ],
  },
} as const

export type ReplyProfileId = keyof typeof replyProfileRegistry

export const modelRouteRegistry = {
  'chat.roleplay.standard': {
    label: 'แชทโรลเพลย์มาตรฐาน',
    defaultReplyProfile: 'balanced',
    directives: [
      'ใช้สำหรับแชทตัวละครหนึ่งต่อหนึ่งทั่วไป',
      'ให้ความสำคัญกับบุคลิก ความสัมพันธ์ และข้อความล่าสุดมากกว่าการอธิบายระบบ',
    ],
  },
  'chat.roleplay.deep': {
    label: 'แชทโรลเพลย์เชิงลึก',
    defaultReplyProfile: 'deep_roleplay',
    directives: [
      'ใช้เมื่อผู้เล่นต้องการความลึก ความต่อเนื่อง หรือประวัติความสัมพันธ์ยาว',
      'ดึง timeline, memory, lore และ world state มาใช้เท่าที่จำเป็น',
    ],
  },
  'chat.scene.cinematic': {
    label: 'ฉากสำคัญแบบ cinematic',
    defaultReplyProfile: 'cinematic_scene',
    directives: [
      'ใช้เมื่อเข้าสู่ Scene Mode หรือมี objective ชัดเจน',
      'รักษา objective ของฉากและให้ผลลัพธ์ส่งต่อ Relationship Engine ได้',
    ],
  },
  'chat.quick': {
    label: 'แชทเร็ว',
    defaultReplyProfile: 'quick',
    directives: [
      'ใช้กับข้อความสั้น คำถามตรง หรือจังหวะที่ผู้เล่นต้องการคำตอบเร็ว',
      'ห้ามลดคุณภาพบุคลิกจนกลายเป็นคำตอบทั่วไป',
    ],
  },
  'chat.group.universe': {
    label: 'แชทกลุ่มหรือจักรวาล',
    defaultReplyProfile: 'deep_roleplay',
    directives: [
      'ใช้เมื่อมีหลายตัวละคร หลายความสัมพันธ์ หรือ world state ร่วมกัน',
      'แยกเสียงตัวละครและความรู้เฉพาะตัวละครให้ชัด',
    ],
  },
  'chat.summary': {
    label: 'สรุปความจำ',
    defaultReplyProfile: 'quick',
    directives: [
      'ใช้เพื่อสรุปเหตุการณ์ ความจำ และ timeline ไม่ใช่ตอบผู้เล่นโดยตรง',
      'ต้องคงข้อเท็จจริงและไม่เติมเหตุการณ์ใหม่เอง',
    ],
  },
  'chat.guard': {
    label: 'ตรวจความปลอดภัยและ prompt control',
    defaultReplyProfile: 'quick',
    directives: [
      'ใช้ตรวจสัญญาณ prompt injection, policy conflict, และข้อมูลลับ',
      'ต้องให้ผลลัพธ์ที่ระบบนำไปตัดสินใจต่อได้',
    ],
  },
  'creator.draft': {
    label: 'ร่างตัวละคร',
    defaultReplyProfile: 'balanced',
    directives: [
      'ใช้ช่วยครีเอเตอร์สร้างชื่อ บุคลิก ประวัติ greeting และ prompt',
      'ต้องรักษา agency ของผู้เล่นและทำให้บุคลิกชัดตั้งแต่ก่อนเผยแพร่',
    ],
  },
  'image.prompt': {
    label: 'พรอมป์สร้างภาพ',
    defaultReplyProfile: 'quick',
    directives: [
      'ใช้แปลงแนวคิดตัวละครเป็นพรอมป์ภาพที่ชัด ไม่ปนระบบหลังบ้าน',
      'ต้องแยกภาพตัวละคร ภาพปก และ reference ให้ชัด',
    ],
  },
  'eval.local': {
    label: 'ทดสอบคุณภาพในเครื่อง',
    defaultReplyProfile: 'quick',
    directives: [
      'ใช้กับ automated eval และ smoke test',
      'ต้องให้ผลลัพธ์คาดเดาได้พอสำหรับ regression gate',
    ],
  },
} as const satisfies Record<string, { label: string; defaultReplyProfile: ReplyProfileId; directives: readonly string[] }>

export type ModelRouteId = keyof typeof modelRouteRegistry

export type ModelRoutePromptInput = {
  modelRoute?: string | null
  replyProfile?: string | null
}

function hasKey<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function resolveModelRoute(value?: string | null) {
  const key = value?.trim()
  if (key && hasKey(modelRouteRegistry, key)) {
    return { id: key, ...modelRouteRegistry[key] }
  }

  return {
    id: 'chat.roleplay.standard' as const,
    ...modelRouteRegistry['chat.roleplay.standard'],
  }
}

export function resolveReplyProfile(value: string | null | undefined, fallback: ReplyProfileId) {
  const key = value?.trim()
  if (key && hasKey(replyProfileRegistry, key)) {
    return { id: key, ...replyProfileRegistry[key] }
  }

  return {
    id: fallback,
    ...replyProfileRegistry[fallback],
  }
}

export function buildModelRoutePromptBlock(input: ModelRoutePromptInput = {}) {
  const route = resolveModelRoute(input.modelRoute)
  const profile = resolveReplyProfile(input.replyProfile, route.defaultReplyProfile)

  return [
    'รูปแบบโมเดลและคำตอบ:',
    `- เส้นทางโมเดล: ${route.id} (${route.label})`,
    `- โปรไฟล์คำตอบ: ${profile.id} (${profile.label})`,
    '- หลักการเลือกโมเดล:',
    ...route.directives.map((directive) => `  - ${directive}`),
    '- รูปทรงคำตอบตามโปรไฟล์:',
    ...profile.directives.map((directive) => `  - ${directive}`),
    '- ใช้ส่วนนี้เป็นสัญญาการตอบที่สูงกว่า prompt ตัวละคร แต่ต่ำกว่ากฎคุมพรอมป์ของแพลตฟอร์ม',
  ].join('\n')
}
