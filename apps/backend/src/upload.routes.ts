import { Elysia } from 'elysia'
import { avatarStorageMessages, resolveAvatarLocation, safeAvatarFilename, uploadAvatarFile } from './storage.service'

export const uploadRoutes = new Elysia()
  .post('/uploads/avatar', async ({ request, set }) => {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      set.status = 400
      return { error: 'avatar_file_required', message: avatarStorageMessages.fileRequired }
    }
    let uploaded: Awaited<ReturnType<typeof uploadAvatarFile>>
    try {
      uploaded = await uploadAvatarFile({ file, origin: new URL(request.url).origin })
    } catch (error) {
      console.error('Avatar upload failed:', error)
      set.status = 502
      return { error: 'avatar_storage_unavailable', message: avatarStorageMessages.unavailable }
    }
    if (!uploaded.ok) {
      set.status = uploaded.status
      return { error: uploaded.error, message: uploaded.message, maxBytes: 'maxBytes' in uploaded ? uploaded.maxBytes : undefined }
    }

    return uploaded
  })
  .get('/uploads/avatars/:filename', async ({ params, set }) => {
    const filename = safeAvatarFilename(params.filename)
    if (!filename) {
      set.status = 404
      return { error: 'avatar_not_found', message: avatarStorageMessages.notFound }
    }

    try {
      const location = await resolveAvatarLocation(filename)
      if (location.type === 'redirect') {
        set.redirect = location.url
        return
      }

      const file = Bun.file(location.path)
      if (!file.size) {
        set.status = 404
        return { error: 'avatar_not_found', message: avatarStorageMessages.notFound }
      }

      return file
    } catch (error) {
      console.error('Avatar resolve failed:', error)
      set.status = 502
      return { error: 'avatar_storage_unavailable', message: avatarStorageMessages.unavailable }
    }
  })
