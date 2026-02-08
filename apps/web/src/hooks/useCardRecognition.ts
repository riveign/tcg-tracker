import { useState, useCallback } from 'react'
import { createWorker } from 'tesseract.js'

interface ScryfallCard {
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
}

interface RecognizedCard extends ScryfallCard {
  confidence: number
}

interface CardRecognitionResult {
  cards: RecognizedCard[]
  ocrText: string
  error?: string
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching card names
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Calculates similarity score between two strings (0-1 range)
 * Higher score means more similar
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1.0

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLength
}

/**
 * Extracts potential card names from OCR text
 * Handles common OCR errors and formatting issues
 */
function extractCardNames(ocrText: string): string[] {
  // Split by newlines and filter empty lines
  const lines = ocrText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2)

  // Remove common noise patterns
  const cleanedLines = lines.map((line) => {
    // Remove special characters commonly misread by OCR
    return line
      .replace(/[^\w\s',-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  })

  // Filter out likely non-card-name lines (too short, all numbers, etc.)
  return cleanedLines.filter((line) => {
    if (line.length < 3) return false
    if (/^\d+$/.test(line)) return false
    if (line.split(' ').length > 8) return false // Card names are typically short
    return true
  })
}

/**
 * Hook for OCR-based card recognition
 * Processes images, extracts text, and matches against card database
 */
export function useCardRecognition() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const recognizeCard = useCallback(
    async (imageFile: File | string): Promise<CardRecognitionResult> => {
      setIsProcessing(true)
      setProgress(0)

      try {
        // Validate input
        if (imageFile instanceof File) {
          if (imageFile.size === 0) {
            throw new Error('Image file is empty')
          }
          if (!imageFile.type.startsWith('image/')) {
            throw new Error('Invalid file type. Expected an image file.')
          }
        }

        // Initialize Tesseract worker
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100))
            }
          },
        })

        // Perform OCR
        const {
          data: { text },
        } = await worker.recognize(imageFile)

        await worker.terminate()

        setProgress(100)

        // Extract potential card names from OCR text
        const potentialNames = extractCardNames(text)

        if (potentialNames.length === 0) {
          setIsProcessing(false)
          return {
            cards: [],
            ocrText: text,
            error: 'No card names detected in image',
          }
        }

        // Get API base URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

        // Search for each potential card name
        const searchResults = await Promise.allSettled(
          potentialNames.map(async (cardName) => {
            try {
              const response = await fetch(
                `${apiUrl}/trpc/cards.search?input=${encodeURIComponent(
                  JSON.stringify({ query: cardName, page: 1 })
                )}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
                  },
                }
              )

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
              }

              const data = await response.json()
              return {
                searchQuery: cardName,
                results: data.result.data.cards || [],
              }
            } catch {
              return {
                searchQuery: cardName,
                results: [],
              }
            }
          })
        )

        // Process results and calculate confidence scores
        const recognizedCards: RecognizedCard[] = []

        searchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.results.length > 0) {
            const { searchQuery, results } = result.value

            // Calculate similarity for each result
            results.forEach((card: RecognizedCard) => {
              const similarity = calculateSimilarity(searchQuery, card.name)

              // Only include cards with reasonable similarity (>60%)
              if (similarity > 0.6) {
                recognizedCards.push({
                  ...card,
                  confidence: Math.round(similarity * 100),
                })
              }
            })
          }
        })

        // Sort by confidence score (highest first)
        recognizedCards.sort((a, b) => b.confidence - a.confidence)

        // Remove duplicates based on card ID
        const uniqueCards = recognizedCards.filter(
          (card, index, self) => index === self.findIndex((c) => c.id === card.id)
        )

        setIsProcessing(false)

        return {
          cards: uniqueCards.slice(0, 10), // Return top 10 matches
          ocrText: text,
        }
      } catch (error) {
        setIsProcessing(false)
        setProgress(0)

        return {
          cards: [],
          ocrText: '',
          error:
            error instanceof Error ? error.message : 'Failed to process image',
        }
      }
    },
    []
  )

  return {
    recognizeCard,
    isProcessing,
    progress,
  }
}
