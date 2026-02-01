import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onClose?: () => void
  isOpen?: boolean
}

type CameraState = 'idle' | 'requesting' | 'streaming' | 'captured' | 'error'

export const CameraCapture = ({ onCapture, onClose, isOpen = true }: CameraCaptureProps) => {
  const [state, setState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    console.log('[CameraCapture] Starting camera')
    setState('requesting')
    setErrorMessage('')

    try {
      console.log('[CameraCapture] Requesting getUserMedia...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      console.log('[CameraCapture] Stream acquired:', stream.id)
      streamRef.current = stream
      setState('streaming')
    } catch (error) {
      console.error('[CameraCapture] Camera error:', error)
      setState('error')

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Camera permission denied. Please allow camera access to continue.')
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No camera found on this device.')
        } else if (error.name === 'NotReadableError') {
          setErrorMessage('Camera is already in use by another application.')
        } else {
          setErrorMessage(`Camera error: ${error.message}`)
        }
      } else {
        setErrorMessage('Failed to access camera. Please try again.')
      }
    }
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage('Video stream not ready. Please try again.')
      setState('error')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) {
      setErrorMessage('Failed to get canvas context.')
      setState('error')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Use PNG format for better compatibility with Tesseract
    const imageData = canvas.toDataURL('image/png')
    setCapturedImage(imageData)
    setState('captured')
    stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setState('idle')
    startCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
      handleClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, onCapture])

  const handleClose = useCallback(() => {
    stopCamera()
    setCapturedImage(null)
    setState('idle')
    setErrorMessage('')
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  useEffect(() => {
    console.log('[CameraCapture] useEffect triggered - isOpen:', isOpen, 'state:', state)

    if (isOpen && state === 'idle') {
      console.log('[CameraCapture] Conditions met, calling startCamera')
      startCamera()
    }

    return () => {
      console.log('[CameraCapture] Cleanup - stopping camera')
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state])

  useEffect(() => {
    const applyStream = async () => {
      if (state === 'streaming' && videoRef.current && streamRef.current) {
        console.log('[CameraCapture] Applying stream to video element')
        videoRef.current.srcObject = streamRef.current
        try {
          await videoRef.current.play()
          console.log('[CameraCapture] Video playback started')
        } catch (error) {
          console.error('[CameraCapture] Video playback error:', error)
          setState('error')
          setErrorMessage('Failed to start video playback. Please try again.')
        }
      }
    }

    applyStream()
  }, [state])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Capture Card Image</DialogTitle>
          <DialogDescription>
            Position the card in the camera view and click capture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View / Captured Image */}
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {state === 'requesting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-sm">Requesting camera access...</p>
                  </div>
                )}

                {state === 'streaming' && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/30 m-8 rounded-lg pointer-events-none" />
                  </>
                )}

                {state === 'captured' && capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured card"
                    className="w-full h-full object-contain"
                  />
                )}

                {state === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-8 text-center">
                    <X className="w-12 h-12 mb-4" />
                    <p className="text-sm mb-4">{errorMessage}</p>
                    <Button onClick={startCamera} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {state === 'streaming' && (
              <>
                <Button onClick={handleClose} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={captureImage} className="flex-1 max-w-xs">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </>
            )}

            {state === 'captured' && (
              <>
                <Button onClick={retakePhoto} variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmCapture} className="flex-1 max-w-xs">
                  <Download className="w-4 h-4 mr-2" />
                  Use This Image
                </Button>
              </>
            )}
          </div>

          {/* Helper Text */}
          {state === 'streaming' && (
            <div className="text-center text-sm text-text-secondary">
              <p>Position the card within the guide frame for best results</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
