import { useCallback, useState } from 'react'
import {
  AI_CREATOR_UPLOAD_SLOT_RULES,
  createAiCreatorUploadPreview,
  validateAiCreatorUploadSlot,
  type AiCreatorUploadPreview,
} from '../lib/aiCreator'

type SetStatusMessage = (message: string) => void

export function useAiCreatorUploadReferences(videoDuration: number, setStatusMessage: SetStatusMessage) {
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceImageMeta, setReferenceImageMeta] = useState<AiCreatorUploadPreview | null>(null)
  const [imageInputError, setImageInputError] = useState<string | null>(null)
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)
  const [referenceVideoMeta, setReferenceVideoMeta] = useState<AiCreatorUploadPreview | null>(null)
  const [videoInputError, setVideoInputError] = useState<string | null>(null)

  const handleImageReferenceFile = useCallback(
    (file: File, input: HTMLInputElement) => {
      const validation = validateAiCreatorUploadSlot(AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage[0], { file })
      if (!validation.ok) {
        setReferenceImage(null)
        setReferenceImageMeta(null)
        setImageInputError(validation.reason)
        setStatusMessage(validation.reason)
        input.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = () => setReferenceImage(reader.result as string)
      reader.readAsDataURL(file)
      setReferenceImageMeta(createAiCreatorUploadPreview(file))
      setImageInputError(null)
      setStatusMessage(`โหลดรูปอ้างอิงแล้ว: ${file.name}`)
    },
    [setStatusMessage],
  )

  const handleVideoReferenceFile = useCallback(
    (file: File, input: HTMLInputElement) => {
      const validation = validateAiCreatorUploadSlot(AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo[0], {
        file,
        durationSeconds: videoDuration,
      })
      if (!validation.ok) {
        setReferenceVideo(null)
        setReferenceVideoMeta(null)
        setVideoInputError(validation.reason)
        setStatusMessage(validation.reason)
        input.value = ''
        return
      }

      setReferenceVideo(file.name)
      setReferenceVideoMeta(createAiCreatorUploadPreview(file))
      setVideoInputError(null)
      setStatusMessage(`โหลดวิดีโออ้างอิงแล้ว: ${file.name}`)
    },
    [setStatusMessage, videoDuration],
  )

  const clearImageReference = useCallback(() => {
    setReferenceImage(null)
    setReferenceImageMeta(null)
    setImageInputError(null)
  }, [])

  const clearVideoReference = useCallback(() => {
    setReferenceVideo(null)
    setReferenceVideoMeta(null)
    setVideoInputError(null)
  }, [])

  return {
    referenceImage,
    referenceImageMeta,
    imageInputError,
    referenceVideo,
    referenceVideoMeta,
    videoInputError,
    handleImageReferenceFile,
    handleVideoReferenceFile,
    clearImageReference,
    clearVideoReference,
    setReferenceImage,
    setReferenceImageMeta,
    setReferenceVideo,
    setReferenceVideoMeta,
  }
}
