import { describe, expect, test } from 'bun:test'
import { buildTokenExpiryNotifications } from './token-expiry.service'

describe('token expiry notifications', () => {
  test('builds Thai-first notification payloads for expiring promotional tokens', () => {
    const notifications = buildTokenExpiryNotifications(
      new Map([
        ['550e8400-e29b-41d4-a716-446655440000', { amount: 120, email: 'player@maprang.local' }],
        ['550e8400-e29b-41d4-a716-446655440001', { amount: 40, email: null }],
      ]),
      3,
    )

    expect(notifications).toEqual([
      {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'player@maprang.local',
        amount: 120,
        daysAhead: 3,
        title: 'โทเคนโปรโมชันจะหมดอายุใน 3 วัน',
        message: 'คุณมีโทเคนโปรโมชัน 120 โทเคนที่จะหมดอายุในอีก 3 วัน ใช้ก่อนหมดอายุเพื่อไม่ให้เสียสิทธิ์',
      },
      {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        email: null,
        amount: 40,
        daysAhead: 3,
        title: 'โทเคนโปรโมชันจะหมดอายุใน 3 วัน',
        message: 'คุณมีโทเคนโปรโมชัน 40 โทเคนที่จะหมดอายุในอีก 3 วัน ใช้ก่อนหมดอายุเพื่อไม่ให้เสียสิทธิ์',
      },
    ])
  })

  test('uses a tomorrow label and skips non-positive notification amounts', () => {
    const notifications = buildTokenExpiryNotifications(
      new Map([
        ['550e8400-e29b-41d4-a716-446655440000', { amount: 5.8, email: 'player@maprang.local' }],
        ['550e8400-e29b-41d4-a716-446655440001', { amount: 0 }],
        ['550e8400-e29b-41d4-a716-446655440002', { amount: -10 }],
      ]),
      1,
    )

    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      amount: 5,
      daysAhead: 1,
      title: 'โทเคนโปรโมชันจะหมดอายุพรุ่งนี้',
      message: 'คุณมีโทเคนโปรโมชัน 5 โทเคนที่จะหมดอายุพรุ่งนี้ ใช้ก่อนหมดอายุเพื่อไม่ให้เสียสิทธิ์',
    })
  })
})
