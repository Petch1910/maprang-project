export type ChatReplySettings = {
  responseDepth: 'quick' | 'balanced' | 'deep' | 'cinematic'
  replyProfile: 'fast_chat' | 'balanced_roleplay' | 'deep_roleplay' | 'cinematic_scene'
  modelRoute: 'chat.roleplay.quick' | 'chat.roleplay.balanced' | 'chat.roleplay.deep' | 'chat.scene.cinematic'
}

export const chatReplyPresets: Array<{
  settings: ChatReplySettings
  label: string
  detail: string
}> = [
  {
    settings: { responseDepth: 'quick', replyProfile: 'fast_chat', modelRoute: 'chat.roleplay.quick' },
    label: 'เร็ว',
    detail: 'ตอบไว กระชับ เหมาะกับคุยสั้น',
  },
  {
    settings: { responseDepth: 'balanced', replyProfile: 'balanced_roleplay', modelRoute: 'chat.roleplay.balanced' },
    label: 'สมดุล',
    detail: 'มีบทพูด อารมณ์ และการกระทำพอดี',
  },
  {
    settings: { responseDepth: 'deep', replyProfile: 'deep_roleplay', modelRoute: 'chat.roleplay.deep' },
    label: 'ละเอียด',
    detail: 'เน้นบรรยากาศ ความคิด และจังหวะโรลเพลย์',
  },
  {
    settings: { responseDepth: 'cinematic', replyProfile: 'cinematic_scene', modelRoute: 'chat.scene.cinematic' },
    label: 'ฉากเข้มข้น',
    detail: 'เหมาะกับ Scene Mode หรือฉากสำคัญที่ต้องยาวขึ้น',
  },
]

export const defaultChatReplySettings: ChatReplySettings = chatReplyPresets[2].settings

export function chatReplyPresetLabel(settings: ChatReplySettings) {
  return chatReplyPresets.find((preset) => preset.settings.responseDepth === settings.responseDepth)?.label ?? 'ละเอียด'
}
