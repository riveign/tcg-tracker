import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Loader2, AlertCircle, Check } from 'lucide-react'
import { CameraCapture } from '@/components/cards/CameraCapture'
import { useCardRecognition } from '@/hooks/useCardRecognition'
import { CardDetailModal } from '@/components/cards/CardDetailModal'
import { Badge } from '@/components/ui/badge'

interface RecognizedCard {
  id: string
  name: string
  set_name: string
  set: string
  collector_number: string
  rarity: string
  image_uris?: {
    small?: string
    normal?: string
  }
  mana_cost?: string
  type_line: string
  confidence: number
}

export const Scan = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [recognizedCards, setRecognizedCards] = useState<RecognizedCard[]>([])
  const [error, setError] = useState<string | null>(null)

  const { recognizeCard, isProcessing, progress } = useCardRecognition()

  const handleCameraCapture = async (imageData: string) => {
    setIsCameraOpen(false)
    setError(null)
    setRecognizedCards([])

    try {
      // Convert base64 to blob
      const response = await fetch(imageData)
      const blob = await response.blob()
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })

      // Run OCR recognition
      const result = await recognizeCard(file)

      if (result.error) {
        setError(result.error)
      } else if (result.cards.length === 0) {
        setError('No cards recognized in the image. Please try again with better lighting or positioning.')
      } else {
        setRecognizedCards(result.cards)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process captured image')
    }
  }

  const handleRetry = () => {
    setError(null)
    setRecognizedCards([])
    setIsCameraOpen(true)
  }

  const getRarityBadgeClass = (rarity: string) => {
    const rarityMap: Record<string, string> = {
      mythic: 'bg-orange-500/20 text-orange-400',
      rare: 'bg-yellow-500/20 text-yellow-400',
      uncommon: 'bg-gray-500/20 text-gray-400',
      common: 'bg-gray-600/20 text-gray-500',
    }
    return rarityMap[rarity] || 'bg-gray-600/20 text-gray-500'
  }

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500/20 text-green-400'
    if (confidence >= 70) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-orange-500/20 text-orange-400'
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-display">
          Scan Cards
        </h1>
        <p className="text-text-secondary mt-1">
          Add cards to your collection using OCR
        </p>
      </div>

      {/* Scan options */}
      <div className="space-y-4">
        <Card className="border-accent-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent-cyan" />
              Camera Scan
            </CardTitle>
            <CardDescription>
              Use your device camera to scan cards in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setIsCameraOpen(true)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Open Camera'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent-lavender" />
              Upload Image
            </CardTitle>
            <CardDescription>
              Upload an image of your card to scan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" disabled>
              Choose File (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <Card className="border-accent-cyan">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-accent-cyan" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Processing Image
                </h3>
                <p className="text-sm text-text-secondary">
                  Running OCR and matching cards...
                </p>
                <div className="mt-4 w-full max-w-xs">
                  <div className="bg-background-card rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-accent-cyan h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-2">{progress}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 mb-1">
                  Recognition Failed
                </h3>
                <p className="text-sm text-red-300/90 mb-3">
                  {error}
                </p>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-red-400/50 text-red-400 hover:bg-red-500/20"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {recognizedCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              Recognized Cards ({recognizedCards.length})
            </h2>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
            >
              Scan Another
            </Button>
          </div>

          <div className="grid gap-3">
            {recognizedCards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer hover:border-accent-cyan transition-colors"
                onClick={() => setSelectedCardId(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Card Thumbnail */}
                    {card.image_uris?.small && (
                      <img
                        src={card.image_uris.small}
                        alt={card.name}
                        className="w-16 h-auto rounded object-cover aspect-[5/7]"
                      />
                    )}

                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-text-primary truncate">
                          {card.name}
                        </h3>
                        <Badge className={getConfidenceBadgeClass(card.confidence)}>
                          {card.confidence}% match
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center text-sm text-text-secondary">
                        <span>{card.set_name}</span>
                        <span>•</span>
                        <span className="uppercase">
                          {card.set} #{card.collector_number}
                        </span>
                        <span>•</span>
                        <Badge className={getRarityBadgeClass(card.rarity)} variant="outline">
                          {card.rarity}
                        </Badge>
                      </div>

                      {card.type_line && (
                        <p className="text-sm text-text-secondary mt-1 truncate">
                          {card.type_line}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Camera Capture Dialog */}
      {isCameraOpen && (
        <CameraCapture
          isOpen={isCameraOpen}
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        open={selectedCardId !== null}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
        cardId={selectedCardId}
      />
    </div>
  )
}
