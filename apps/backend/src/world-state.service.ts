import type { PrismaClient } from '@prisma/client'
import { defaultUserId } from './config'
import { getPrisma } from './db'
import { isUuid } from './security'

type Prisma = PrismaClient

export type WorldState = {
  timeOfDay: string
  location: string
  weather: string
  mood: string
  sceneNotes: string[]
  updatedAt: string
}

export type WorldStateInput = Partial<{
  timeOfDay: string
  location: string
  weather: string
  mood: string
  sceneNotes: string[]
}>

const stringLimits = {
  timeOfDay: 80,
  location: 120,
  weather: 80,
  mood: 80,
  sceneNote: 180,
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  const suffix = '...'
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength)
  return `${cleaned.slice(0, maxLength - suffix.length)}${suffix}`
}

function cleanSceneNotes(value: unknown) {
  const notes = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n')
      : []

  return notes
    .map((note) => cleanString(note, stringLimits.sceneNote))
    .filter(Boolean)
    .slice(0, 5)
}

export function coerceWorldState(value: unknown, fallbackUpdatedAt = ''): WorldState {
  const record = asRecord(value)

  return {
    timeOfDay: cleanString(record.timeOfDay, stringLimits.timeOfDay),
    location: cleanString(record.location, stringLimits.location),
    weather: cleanString(record.weather, stringLimits.weather),
    mood: cleanString(record.mood, stringLimits.mood),
    sceneNotes: cleanSceneNotes(record.sceneNotes),
    updatedAt: cleanString(record.updatedAt, 40) || fallbackUpdatedAt,
  }
}

export function mergeWorldState(previousValue: unknown, input: WorldStateInput, now = new Date().toISOString()) {
  const previous = coerceWorldState(previousValue, now)

  return {
    timeOfDay:
      input.timeOfDay === undefined ? previous.timeOfDay : cleanString(input.timeOfDay, stringLimits.timeOfDay),
    location: input.location === undefined ? previous.location : cleanString(input.location, stringLimits.location),
    weather: input.weather === undefined ? previous.weather : cleanString(input.weather, stringLimits.weather),
    mood: input.mood === undefined ? previous.mood : cleanString(input.mood, stringLimits.mood),
    sceneNotes: input.sceneNotes === undefined ? previous.sceneNotes : cleanSceneNotes(input.sceneNotes),
    updatedAt: now,
  } satisfies WorldState
}

export function hasWorldStateContent(value: unknown) {
  const worldState = coerceWorldState(value)
  return Boolean(
    worldState.timeOfDay ||
      worldState.location ||
      worldState.weather ||
      worldState.mood ||
      worldState.sceneNotes.length > 0,
  )
}

export function buildWorldStatePrompt(value: unknown) {
  if (!hasWorldStateContent(value)) return ''
  const worldState = coerceWorldState(value)
  const lines = [
    worldState.timeOfDay ? `เวลา: ${worldState.timeOfDay}` : '',
    worldState.location ? `สถานที่: ${worldState.location}` : '',
    worldState.weather ? `สภาพอากาศ: ${worldState.weather}` : '',
    worldState.mood ? `อารมณ์บรรยากาศ: ${worldState.mood}` : '',
    worldState.sceneNotes.length > 0 ? `โน้ตฉาก: ${worldState.sceneNotes.join(' | ')}` : '',
    'ถือว่านี่คือสถานะโลกปัจจุบัน รักษาไว้เว้นแต่ผู้เล่นหรือฉากเปลี่ยนอย่างชัดเจน',
  ].filter(Boolean)

  return `สถานะโลกปัจจุบัน:\n${lines.join('\n')}`
}

export async function loadChatWorldState(chatId: string, userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma || !isUuid(chatId) || !isUuid(userId)) return null

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
      memory: true,
    },
  })
  if (!chat) return null

  return {
    chatId: chat.id,
    worldState: coerceWorldState(asRecord(chat.memory).worldState),
  }
}

export async function updateChatWorldState(chatId: string, userId = defaultUserId, input: WorldStateInput, prisma?: Prisma) {
  const db = prisma ?? getPrisma()
  if (!db || !isUuid(chatId) || !isUuid(userId)) return null

  const chat = await db.chat.findFirst({
    where: {
      id: chatId,
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
      memory: true,
    },
  })
  if (!chat) return null

  const memory = asRecord(chat.memory)
  const worldState = mergeWorldState(memory.worldState, input)
  await db.chat.update({
    where: { id: chat.id },
    data: {
      memory: {
        ...memory,
        worldState,
      },
    },
  })

  return {
    chatId: chat.id,
    worldState,
  }
}
