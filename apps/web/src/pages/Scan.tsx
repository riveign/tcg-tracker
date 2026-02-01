import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Upload } from 'lucide-react'

export const Scan = () => {
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
            <Button className="w-full">Open Camera</Button>
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
            <Button variant="secondary" className="w-full">
              Choose File
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
