import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, Download, Loader2, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onClose?: () => void
  isOpen?: boolean
}

type CameraState = 'idle' | 'requesting' | 'streaming' | 'captured' | 'error'

interface CameraDevice {
  deviceId: string
  label: string
}

export const CameraCapture = ({ onCapture, onClose, isOpen = true }: CameraCaptureProps) => {
  const [state, setState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false)

  // Log state changes
  useEffect(() => {
    console.log('[CameraCapture] State changed to:', state)
  }, [state])

  // Log captured image changes
  useEffect(() => {
    console.log('[CameraCapture] Captured image updated:', capturedImage ? `${capturedImage.substring(0, 50)}...` : 'null')
  }, [capturedImage])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const enumerateCameras = useCallback(async () => {
    try {
      console.log('[CameraCapture] Enumerating cameras...')
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }))

      console.log('[CameraCapture] Found cameras:', videoDevices)
      setCameras(videoDevices)

      // Auto-select rear camera on mobile, or first camera on desktop
      const rearCamera = videoDevices.find(cam =>
        cam.label.toLowerCase().includes('back') ||
        cam.label.toLowerCase().includes('rear') ||
        cam.label.toLowerCase().includes('environment')
      )
      const defaultCamera = rearCamera || videoDevices[0]

      if (defaultCamera) {
        console.log('[CameraCapture] Auto-selecting camera:', defaultCamera.label)
        setSelectedCamera(defaultCamera.deviceId)
      }
    } catch (error) {
      console.error('[CameraCapture] Failed to enumerate cameras:', error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    console.log('[CameraCapture] Stopping camera')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[CameraCapture] Stopping track:', track.label)
        track.stop()
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsVideoReady(false)
  }, [])

  const startCamera = useCallback(async (deviceId?: string) => {
    console.log('[CameraCapture] Starting camera with deviceId:', deviceId || 'default')
    setState('requesting')
    setErrorMessage('')

    try {
      // Stop any existing stream first
      stopCamera()

      console.log('[CameraCapture] Requesting getUserMedia...')
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              // Fallback: Try environment camera first, then any camera
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log('[CameraCapture] Stream acquired:', {
        streamId: stream.id,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      })

      streamRef.current = stream
      setState('streaming')

      // Enumerate cameras after successful stream (for better labels)
      if (cameras.length === 0) {
        await enumerateCameras()
      }
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
        } else if (error.name === 'OverconstrainedError') {
          setErrorMessage('Selected camera is not available. Please try another camera.')
        } else {
          setErrorMessage(`Camera error: ${error.message}`)
        }
      } else {
        setErrorMessage('Failed to access camera. Please try again.')
      }
    }
  }, [stopCamera, cameras.length, enumerateCameras])

  const captureImage = useCallback(() => {
    console.log('[CameraCapture] captureImage called')
    if (!videoRef.current || !canvasRef.current) {
      console.error('[CameraCapture] Missing refs:', {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
      })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    console.log('[CameraCapture] Video dimensions:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
    })

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('[CameraCapture] Invalid video dimensions')
      setErrorMessage('Video stream not ready. Please try again.')
      setState('error')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    console.log('[CameraCapture] Canvas dimensions set:', {
      width: canvas.width,
      height: canvas.height,
    })

    const context = canvas.getContext('2d')
    if (!context) {
      console.error('[CameraCapture] Failed to get canvas context')
      setErrorMessage('Failed to get canvas context.')
      setState('error')
      return
    }

    console.log('[CameraCapture] Drawing image to canvas...')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Use PNG format for better compatibility with Tesseract
    const imageData = canvas.toDataURL('image/png')
    console.log('[CameraCapture] Image captured:', {
      dataUrlLength: imageData.length,
      dataUrlPrefix: imageData.substring(0, 50),
    })

    setCapturedImage(imageData)
    setState('captured')
    stopCamera()
    // Intentionally omit stopCamera from dependencies to keep callback stable
    // stopCamera itself is memoized and doesn't need to trigger callback recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setState('idle')
    startCamera()
    // Intentionally omit startCamera from dependencies to keep callback stable
    // startCamera itself is memoized and doesn't need to trigger callback recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
      handleClose()
    }
    // Intentionally omit handleClose from dependencies as it's a stable memoized function
    // and we don't want to recreate this callback when handleClose changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, onCapture])

  const handleClose = useCallback(() => {
    stopCamera()
    setCapturedImage(null)
    setState('idle')
    setErrorMessage('')
    onClose?.()
    // Intentionally omit stopCamera from dependencies to keep callback stable
    // stopCamera itself is memoized and doesn't need to trigger callback recreation
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
    // Intentionally omit stopCamera and startCamera from dependencies
    // These are memoized functions that don't need to trigger effect recreation
    // Only re-run effect when isOpen or state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state])

  const handleCameraSwitch = useCallback((deviceId: string) => {
    console.log('[CameraCapture] Switching to camera:', deviceId)
    setSelectedCamera(deviceId)
    startCamera(deviceId)
  }, [startCamera])

  useEffect(() => {
    const applyStream = async () => {
      if (state === 'streaming' && videoRef.current && streamRef.current) {
        console.log('[CameraCapture] Applying stream to video element')
        console.log('[CameraCapture] Video element ready state:', videoRef.current.readyState)

        const video = videoRef.current
        let pollIntervalId: NodeJS.Timeout | null = null
        let hasMetadataFired = false

        // Add loadedmetadata event listener to track when video dimensions are ready
        const handleLoadedMetadata = () => {
          if (hasMetadataFired) return
          hasMetadataFired = true

          console.log('[CameraCapture] Video metadata loaded (via event):', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          })
          setIsVideoReady(video.videoWidth > 0 && video.videoHeight > 0)

          // Clear polling if it was started
          if (pollIntervalId) {
            clearInterval(pollIntervalId)
            pollIntervalId = null
          }
        }

        // Attach listener BEFORE setting srcObject
        video.addEventListener('loadedmetadata', handleLoadedMetadata)

        // Set the stream
        video.srcObject = streamRef.current

        // Check if metadata is already loaded (event may have fired before listener attached)
        if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[CameraCapture] Video metadata already loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          })
          hasMetadataFired = true
          setIsVideoReady(true)
        }

        try {
          console.log('[CameraCapture] Attempting to play video...')
          await video.play()
          console.log('[CameraCapture] Video playback started successfully', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          })

          // If metadata still not ready after play, start polling as fallback
          if (!hasMetadataFired) {
            console.log('[CameraCapture] Starting dimension polling fallback')
            let pollAttempts = 0
            const maxPollAttempts = 30 // 3 seconds at 100ms intervals

            pollIntervalId = setInterval(() => {
              pollAttempts++

              if (video.videoWidth > 0 && video.videoHeight > 0) {
                console.log('[CameraCapture] Video metadata loaded (via polling):', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                  attempts: pollAttempts,
                })
                hasMetadataFired = true
                setIsVideoReady(true)

                if (pollIntervalId) {
                  clearInterval(pollIntervalId)
                  pollIntervalId = null
                }
              } else if (pollAttempts >= maxPollAttempts) {
                console.error('[CameraCapture] Polling timeout - metadata not loaded after 3s')
                if (pollIntervalId) {
                  clearInterval(pollIntervalId)
                  pollIntervalId = null
                }
              }
            }, 100)
          }
        } catch (error) {
          console.error('[CameraCapture] Video playback error:', error)
          setState('error')
          setErrorMessage('Failed to start video playback. Please try again.')
        }

        // Cleanup event listener and polling
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          if (pollIntervalId) {
            clearInterval(pollIntervalId)
          }
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
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/30 m-8 rounded-lg pointer-events-none" />

                    {/* Camera Selector */}
                    {cameras.length > 1 && (
                      <div className="absolute top-4 right-4 z-10">
                        <Select value={selectedCamera} onValueChange={handleCameraSwitch}>
                          <SelectTrigger className="w-[200px] bg-black/50 backdrop-blur-sm border-white/30">
                            <SwitchCamera className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Select camera" />
                          </SelectTrigger>
                          <SelectContent>
                            {cameras.map((camera) => (
                              <SelectItem key={camera.deviceId} value={camera.deviceId}>
                                {camera.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {state === 'captured' && capturedImage && (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <img
                      src={capturedImage}
                      alt="Captured card"
                      className="w-full h-full object-contain"
                      onLoad={() => console.log('[CameraCapture] Image loaded successfully')}
                      onError={(e) => console.error('[CameraCapture] Image load error:', e)}
                    />
                  </div>
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

                {/* Canvas for capturing - kept hidden but needs to exist in DOM */}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  style={{ display: 'none' }}
                />
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
                <Button
                  onClick={captureImage}
                  className="flex-1 max-w-xs"
                  disabled={!isVideoReady}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isVideoReady ? 'Capture' : 'Loading...'}
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
