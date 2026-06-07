/**
 * Scenario Templates สำหรับทดสอบตัวละคร
 * ช่วยให้ creator ทดสอบตัวละครในสถานการณ์ต่างๆ อย่างครบถ้วน
 */

export type ScenarioCategory =
  | 'greeting'
  | 'conversation'
  | 'emotional'
  | 'conflict'
  | 'roleplay'
  | 'relationship'
  | 'personality'
  | 'knowledge'

export type ScenarioTemplate = {
  id: string
  category: ScenarioCategory
  name: string
  description: string
  userMessage: string
  expectedBehavior: string[]
  testingGoals: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  relationshipContext?: string
  userPersona?: string
}

/**
 * Scenario Templates Library
 */
export const scenarioTemplates: ScenarioTemplate[] = [
  // === Greeting Scenarios ===
  {
    id: 'greeting-casual',
    category: 'greeting',
    name: 'ทักทายแบบสบายๆ',
    description: 'ทดสอบการทักทายครั้งแรกแบบเป็นกันเอง',
    userMessage: 'สวัสดีครับ วันนี้เป็นยังไงบ้าง',
    expectedBehavior: [
      'ทักทายกลับอย่างเป็นมิตร',
      'แสดงบุคลิกของตัวละคร',
      'เปิดโอกาสให้คุยต่อ',
    ],
    testingGoals: [
      'ทดสอบการทักทายครั้งแรก',
      'ตรวจสอบความเป็นธรรมชาติ',
      'ดูการเปิดบทสนทนา',
    ],
    difficulty: 'easy',
  },
  {
    id: 'greeting-formal',
    category: 'greeting',
    name: 'ทักทายแบบสุภาพ',
    description: 'ทดสอบการทักทายในบริบทที่เป็นทางการ',
    userMessage: 'เรียนคุณ ยินดีที่ได้รู้จักครับ',
    expectedBehavior: [
      'ตอบรับอย่างสุภาพเหมาะสม',
      'รักษาระดับความสุภาพ',
      'แสดงความเป็นมืออาชีพ',
    ],
    testingGoals: [
      'ทดสอบการปรับระดับภาษา',
      'ตรวจสอบความเหมาะสม',
    ],
    difficulty: 'easy',
  },
  {
    id: 'greeting-enthusiastic',
    category: 'greeting',
    name: 'ทักทายแบบกระตือรือร้น',
    description: 'ทดสอบการตอบรับความกระตือรือร้น',
    userMessage: 'ว้าว! ฉันรอคอยที่จะได้คุยกับคุณมานานแล้ว!',
    expectedBehavior: [
      'ตอบรับพลังงานเชิงบวก',
      'แสดงความยินดีที่เหมาะสม',
      'รักษาบุคลิกของตัวเอง',
    ],
    testingGoals: [
      'ทดสอบการตอบสนองอารมณ์',
      'ดูความสามารถในการ match energy',
    ],
    difficulty: 'medium',
  },

  // === Conversation Scenarios ===
  {
    id: 'conversation-small-talk',
    category: 'conversation',
    name: 'คุยเรื่องทั่วไป',
    description: 'ทดสอบการสนทนาเรื่องธรรมดาๆ',
    userMessage: 'วันนี้อากาศดีจังเลย เหมาะกับการออกไปเดินเล่นนะ',
    expectedBehavior: [
      'ตอบรับและขยายบทสนทนา',
      'เพิ่มรายละเอียดที่น่าสนใจ',
      'ทำให้สนทนาไหลลื่น',
    ],
    testingGoals: [
      'ทดสอบ small talk skill',
      'ดูความเป็นธรรมชาติ',
    ],
    difficulty: 'easy',
  },
  {
    id: 'conversation-opinion',
    category: 'conversation',
    name: 'ถามความคิดเห็น',
    description: 'ทดสอบการแสดงความคิดเห็น',
    userMessage: 'คุณคิดว่าอะไรคือสิ่งสำคัญที่สุดในชีวิต',
    expectedBehavior: [
      'แสดงความคิดเห็นที่สอดคล้องกับบุคลิก',
      'ให้เหตุผลที่น่าสนใจ',
      'เปิดโอกาสให้แลกเปลี่ยน',
    ],
    testingGoals: [
      'ทดสอบความลึกของตัวละคร',
      'ตรวจสอบความสอดคล้อง',
    ],
    difficulty: 'medium',
  },
  {
    id: 'conversation-hobby',
    category: 'conversation',
    name: 'คุยเรื่องงานอดิเรก',
    description: 'ทดสอบการพูดถึงความสนใจ',
    userMessage: 'ช่วงนี้คุณชอบทำอะไรในเวลาว่างครับ',
    expectedBehavior: [
      'เล่าเรื่องงานอดิเรกที่เข้ากับตัวละคร',
      'แสดงความกระตือรือร้น',
      'เชิญชวนแบ่งปัน',
    ],
    testingGoals: [
      'ทดสอบความสมจริง',
      'ดูรายละเอียดของตัวละคร',
    ],
    difficulty: 'easy',
  },

  // === Emotional Scenarios ===
  {
    id: 'emotional-happy',
    category: 'emotional',
    name: 'สถานการณ์มีความสุข',
    description: 'ทดสอบการแสดงความยินดี',
    userMessage: 'เฮ้! วันนี้ฉันได้รับข่าวดีมากเลย ฉันสอบผ่านแล้ว!',
    expectedBehavior: [
      'แสดงความยินดีอย่างจริงใจ',
      'ให้กำลังใจและชมเชย',
      'แบ่งปันความสุขด้วย',
    ],
    testingGoals: [
      'ทดสอบ emotional intelligence',
      'ดูความเข้าใจอารมณ์',
    ],
    difficulty: 'medium',
  },
  {
    id: 'emotional-sad',
    category: 'emotional',
    name: 'สถานการณ์เศร้า',
    description: 'ทดสอบการให้กำลังใจ',
    userMessage: 'วันนี้ฉันรู้สึกแย่มากเลย ทุกอย่างดูไม่เป็นไปตามที่คิด',
    expectedBehavior: [
      'แสดงความเห็นอกเห็นใจ',
      'ให้กำลังใจที่เหมาะสม',
      'ไม่ละเมิดขอบเขต',
    ],
    testingGoals: [
      'ทดสอบการให้กำลังใจ',
      'ดูความเข้าใจ empathy',
    ],
    difficulty: 'hard',
  },
  {
    id: 'emotional-angry',
    category: 'emotional',
    name: 'สถานการณ์โกรธ',
    description: 'ทดสอบการจัดการความโกรธ',
    userMessage: 'ฉันโกรธมากเลย! ทำไมทุกอย่างถึงได้ผิดพลาดขนาดนี้!',
    expectedBehavior: [
      'รับฟังและให้พื้นที่',
      'ช่วยทำให้สงบลง',
      'ไม่เติมเชื้อไฟ',
    ],
    testingGoals: [
      'ทดสอบการจัดการวิกฤต',
      'ดูความสามารถในการปลอบโยน',
    ],
    difficulty: 'hard',
  },
  {
    id: 'emotional-anxious',
    category: 'emotional',
    name: 'สถานการณ์กังวล',
    description: 'ทดสอบการช่วยลดความกังวล',
    userMessage: 'ฉันกังวลมากเลยกับเรื่องพรุ่งนี้ ไม่รู้จะเป็นยังไง',
    expectedBehavior: [
      'ให้ความมั่นใจ',
      'ช่วยคิดแง่บวก',
      'เสนอวิธีแก้ปัญหา',
    ],
    testingGoals: [
      'ทดสอบ reassurance skill',
      'ดูความสามารถในการสนับสนุน',
    ],
    difficulty: 'medium',
  },

  // === Conflict Scenarios ===
  {
    id: 'conflict-disagreement',
    category: 'conflict',
    name: 'ความเห็นไม่ตรงกัน',
    description: 'ทดสอบการจัดการความขัดแย้ง',
    userMessage: 'ฉันไม่เห็นด้วยกับคุณเลย คุณคิดผิดแล้ว',
    expectedBehavior: [
      'ตอบรับอย่างสุภาพ',
      'แสดงมุมมองของตัวเอง',
      'ไม่โต้เถียงรุนแรง',
    ],
    testingGoals: [
      'ทดสอบการจัดการความขัดแย้ง',
      'ดูความยืดหยุ่น',
    ],
    difficulty: 'hard',
  },
  {
    id: 'conflict-misunderstanding',
    category: 'conflict',
    name: 'เข้าใจผิด',
    description: 'ทดสอบการแก้ไขความเข้าใจผิด',
    userMessage: 'เดี๋ยวนะ ฉันคิดว่าคุณหมายถึงอีกอย่างนึง',
    expectedBehavior: [
      'ชี้แจงอย่างชัดเจน',
      'แสดงความเข้าใจ',
      'แก้ไขอย่างสร้างสรรค์',
    ],
    testingGoals: [
      'ทดสอบความชัดเจน',
      'ดูทักษะการสื่อสาร',
    ],
    difficulty: 'medium',
  },

  // === Roleplay Scenarios ===
  {
    id: 'roleplay-adventure',
    category: 'roleplay',
    name: 'ผจญภัย',
    description: 'ทดสอบการเล่นในฉากผจญภัย',
    userMessage: 'มาเลย! เราไปสำรวจถ้ำลึกลับนั่นกันดีกว่า',
    expectedBehavior: [
      'ร่วมในบรรยากาศผจญภัย',
      'เพิ่มรายละเอียดฉาก',
      'ทำให้เรื่องน่าตื่นเต้น',
    ],
    testingGoals: [
      'ทดสอบ roleplay skill',
      'ดูจินตนาการและความคิดสร้างสรรค์',
    ],
    difficulty: 'medium',
  },
  {
    id: 'roleplay-slice-of-life',
    category: 'roleplay',
    name: 'ชีวิตประจำวัน',
    description: 'ทดสอบการเล่นฉากชีวิตจริง',
    userMessage: 'เราไปดื่มกาแฟที่คาเฟ่ริมหน้าต่างกันไหม',
    expectedBehavior: [
      'สร้างบรรยากาศอบอุ่น',
      'เพิ่มรายละเอียดน่ารัก',
      'ทำให้รู้สึกเหมือนจริง',
    ],
    testingGoals: [
      'ทดสอบความเป็นธรรมชาติ',
      'ดูรายละเอียดในชีวิตประจำวัน',
    ],
    difficulty: 'easy',
  },

  // === Relationship Scenarios ===
  {
    id: 'relationship-trust',
    category: 'relationship',
    name: 'สร้างความไว้วางใจ',
    description: 'ทดสอบการสร้างความสัมพันธ์',
    userMessage: 'ฉันอยากจะเล่าเรื่องส่วนตัวให้คุณฟังหน่อย',
    expectedBehavior: [
      'รับฟังอย่างตั้งใจ',
      'แสดงความเข้าใจ',
      'สร้างบรรยากาศปลอดภัย',
    ],
    testingGoals: [
      'ทดสอบการสร้าง rapport',
      'ดูความน่าเชื่อถือ',
    ],
    difficulty: 'medium',
  },
  {
    id: 'relationship-boundary',
    category: 'relationship',
    name: 'เคารพขอบเขต',
    description: 'ทดสอบการเคารพพื้นที่ส่วนตัว',
    userMessage: 'ขอโทษนะ แต่เรื่องนี้ฉันยังไม่พร้อมจะพูดถึง',
    expectedBehavior: [
      'เคารพความรู้สึก',
      'ไม่ฝืนเร่งเร้า',
      'แสดงความเข้าใจ',
    ],
    testingGoals: [
      'ทดสอบความเคารพ',
      'ดู emotional intelligence',
    ],
    difficulty: 'hard',
  },

  // === Personality Test Scenarios ===
  {
    id: 'personality-humor',
    category: 'personality',
    name: 'ทดสอบอารมณ์ขัน',
    description: 'ทดสอบความสามารถในการสร้างรอยยิ้ม',
    userMessage: 'เล่าอะไรตลกๆ ให้ฟังหน่อยสิ วันนี้เครียดมาก',
    expectedBehavior: [
      'ตอบสนองตามบุคลิก',
      'พยายามสร้างรอยยิ้ม',
      'ไม่ฝืนถ้าไม่เหมาะสม',
    ],
    testingGoals: [
      'ทดสอบอารมณ์ขัน',
      'ดูความยืดหยุ่นของบุคลิก',
    ],
    difficulty: 'medium',
  },
  {
    id: 'personality-serious',
    category: 'personality',
    name: 'ทดสอบความจริงจัง',
    description: 'ทดสอบการจัดการเรื่องจริงจัง',
    userMessage: 'ฉันมีเรื่องสำคัญอยากจะพูดคุยกับคุณอย่างจริงจัง',
    expectedBehavior: [
      'ปรับบรรยากาศให้เหมาะสม',
      'ตั้งใจรับฟัง',
      'แสดงความจริงจัง',
    ],
    testingGoals: [
      'ทดสอบการปรับตัว',
      'ดูความละเอียดอ่อน',
    ],
    difficulty: 'medium',
  },

  // === Knowledge Test Scenarios ===
  {
    id: 'knowledge-expertise',
    category: 'knowledge',
    name: 'ทดสอบความเชี่ยวชาญ',
    description: 'ทดสอบความรู้ในสาขาของตัวละคร',
    userMessage: 'คุณรู้เรื่องนี้ไหม ช่วยอธิบายให้ฟังหน่อย',
    expectedBehavior: [
      'แสดงความรู้ที่สอดคล้อง',
      'อธิบายอย่างชัดเจน',
      'ยอมรับถ้าไม่รู้',
    ],
    testingGoals: [
      'ทดสอบความสอดคล้องของตัวละคร',
      'ดูความน่าเชื่อถือ',
    ],
    difficulty: 'hard',
  },
  {
    id: 'knowledge-ignorance',
    category: 'knowledge',
    name: 'ทดสอบการยอมรับความไม่รู้',
    description: 'ทดสอบการจัดการกับสิ่งที่ไม่รู้',
    userMessage: 'คุณรู้จักเรื่องฟิสิกส์ควอนตัมไหม',
    expectedBehavior: [
      'ยอมรับถ้าไม่รู้',
      'แสดงความสนใจเรียนรู้',
      'ไม่แกล้งทำเป็นรู้',
    ],
    testingGoals: [
      'ทดสอบความซื่อสัตย์',
      'ดูความสมจริง',
    ],
    difficulty: 'medium',
  },
]

/**
 * Filter scenarios by category
 */
export function getScenariosByCategory(category: ScenarioCategory): ScenarioTemplate[] {
  return scenarioTemplates.filter((s) => s.category === category)
}

/**
 * Filter scenarios by difficulty
 */
export function getScenariosByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): ScenarioTemplate[] {
  return scenarioTemplates.filter((s) => s.difficulty === difficulty)
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): ScenarioTemplate | undefined {
  return scenarioTemplates.find((s) => s.id === id)
}

/**
 * Get all categories
 */
export function getAllCategories(): ScenarioCategory[] {
  return ['greeting', 'conversation', 'emotional', 'conflict', 'roleplay', 'relationship', 'personality', 'knowledge']
}

/**
 * Get recommended scenarios for basic testing
 */
export function getBasicTestScenarios(): ScenarioTemplate[] {
  return [
    'greeting-casual',
    'conversation-small-talk',
    'emotional-happy',
    'roleplay-slice-of-life',
  ].map((id) => getScenarioById(id)).filter((s): s is ScenarioTemplate => s !== undefined)
}

/**
 * Get comprehensive test scenarios
 */
export function getComprehensiveTestScenarios(): ScenarioTemplate[] {
  return [
    'greeting-casual',
    'greeting-formal',
    'conversation-small-talk',
    'conversation-opinion',
    'emotional-happy',
    'emotional-sad',
    'conflict-disagreement',
    'roleplay-slice-of-life',
    'relationship-trust',
    'personality-humor',
    'knowledge-expertise',
  ].map((id) => getScenarioById(id)).filter((s): s is ScenarioTemplate => s !== undefined)
}
