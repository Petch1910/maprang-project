import { isUuid } from './security'

export type RouteSet = {
  status?: number | string
}

export function rejectInvalidUuid(id: string, set: RouteSet, error = 'invalid_id') {
  if (isUuid(id)) return null
  set.status = 400
  return { error }
}
