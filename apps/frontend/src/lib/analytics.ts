import { logUnexpectedError, trackAnalyticsEvent, type FrontendAnalyticsEventInput } from './api'

export function trackFrontendEventSafe(input: FrontendAnalyticsEventInput) {
  void trackAnalyticsEvent(input).catch((error) => {
    logUnexpectedError('บันทึก analytics event ฝั่งหน้าเว็บไม่สำเร็จ:', error)
  })
}

export function currentRoutePath() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}
