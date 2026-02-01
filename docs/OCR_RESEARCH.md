# OCR & Card Recognition Research

Research findings on OCR technologies and implementation strategies for MTG card name extraction from photos.

## OCR Technology Comparison

### Cloud-Based OCR Services

#### Google Cloud Vision API
- **Accuracy**: 95%+ for complex/stylized text
- **Free Tier**: 1,000 units/month forever + $300 credit for new customers
- **Pricing**: $1.50 per 1,000 images after free tier
- **Pros**: Best-in-class accuracy, simple API, handles varied fonts/lighting
- **Cons**: Requires internet, privacy concerns (images sent to Google)
- **Best for**: High accuracy requirements, production applications

#### AWS Textract/Rekognition
- **Accuracy**: 95%+ comparable to Google
- **Free Tier**: 5,000 images/month for 12 months
- **Pricing**: $1.00 per 1,000 images after free tier
- **Pros**: Excellent accuracy, AWS ecosystem integration
- **Cons**: More complex setup, time-limited free tier
- **Best for**: AWS users, high-volume production apps

#### Azure Computer Vision Read API
- **Accuracy**: 95%+ comparable to Google/AWS
- **Used by**: MTGScan project (proven MTG use case)
- **Pros**: Good accuracy, proven for MTG scanning
- **Cons**: Azure ecosystem lock-in
- **Best for**: Azure users

### Client-Side OCR

#### Tesseract.js
- **Accuracy**: 20-40% handwritten, 95%+ clean printed text
- **Cost**: Free, runs entirely in browser
- **Latest Version**: v6.0.0 (2024)
- **Pros**:
  - Zero cost, unlimited usage
  - Complete privacy (no data sent to servers)
  - No API keys or server setup
  - Works offline
  - Supports 100+ languages
- **Cons**:
  - Lower accuracy on stylized/foil cards
  - Slower processing (2-5 seconds client-side)
  - Struggles with poor lighting/angles
- **Best for**: Personal projects, privacy-focused apps, proof-of-concept

## MTG-Specific Solutions

### MTGScan
- **GitHub**: https://github.com/fortierq/mtgscan
- **Technology**: Azure Computer Vision + SymSpell fuzzy matching
- **Architecture**: Flask + Celery + Redis for async processing
- **Key Insight**: Combines OCR with fuzzy matching to handle errors gracefully
- **Open Source**: Available for reference

### TCG OCR Scanner
- **GitHub**: https://github.com/starstuffharvestingstarlight/tcg-ocr-scanner
- **Technology**: Tesseract + OpenCV
- **Support**: Generic TCG scanner, MTG subset
- **Preprocessing**: Uses OpenCV for image enhancement

### Commercial APIs

#### Ximilar Card Identifier
- **Approach**: Visual recognition (not OCR) - image similarity matching
- **Accuracy**: 97%+ for exact card matching
- **Returns**: Card name, set, edition, language, year
- **Pricing**: Business plan required (expensive for personal use)
- **Pros**: Very high accuracy, handles foils/variants
- **Cons**: Expensive

#### Roboflow MTG Card Scanner
- **Approach**: Object detection + classification
- **Use Case**: Card detection in images (bounding boxes)
- **Pricing**: Free tier available

## Image Preprocessing for Better OCR

Research shows preprocessing can improve accuracy from 70% to 99%.

### Essential Steps

1. **Resolution**: Ensure 300+ DPI
2. **Cropping**: Crop to card name area with ~10px border
3. **Contrast Enhancement**: Use CLAHE (Contrast Limited Adaptive Histogram Equalization)
4. **Binarization**: Convert to black/white for text extraction
5. **Deskewing**: Rotate to horizontal alignment

### Tools for Browser

**OpenCV.js**
- Runs in browser via WebAssembly
- Provides grayscale, threshold, blur, rotation functions
- Active as of 2026
- **Tutorial**: https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html

### Preprocessing Example

```javascript
// Target just the card name region
const nameRegion = {
  x: cardWidth * 0.08,      // 8% from left
  y: cardHeight * 0.55,     // 55% from top (name bar area)
  width: cardWidth * 0.84,  // 84% of width
  height: cardHeight * 0.08 // 8% of height
};

// Enhance contrast
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
cv.createCLAHE(2.0, new cv.Size(8, 8)).apply(gray, gray);

// Binarize
cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
```

## Fuzzy Matching with Scryfall

### Scryfall Fuzzy Name Search

```
GET https://api.scryfall.com/cards/named?fuzzy={ocr_result}
```

**Key Features:**
- Case-insensitive
- Punctuation-optional
- Examples: "jac bele" → "Jace Beleren", "aust com" → "Austere Command"
- Returns 404 if ambiguous or no match
- Optional set parameter to narrow search

**Perfect Pairing**: OCR errors are expected and handled gracefully by Scryfall's fuzzy matching.

### SymSpell for Local Fuzzy Matching

**SymSpell** (https://github.com/wolfgarbe/SymSpell)
- **Performance**: 1,000x faster than traditional spell check
- **Algorithm**: Symmetric Delete - only uses deletes
- **Use Case**: Pre-match OCR results before calling Scryfall API
- **Languages**: JavaScript, Python, Rust, Go, C# implementations
- **Data Source**: Build dictionary from Scryfall bulk data

## Recommended v1 Solution: Client-Side OCR + Scryfall

### Architecture

```
Mobile Camera → Canvas Capture → OpenCV.js Preprocessing →
Tesseract.js OCR → Scryfall Fuzzy API → Card Data
```

### Technology Stack

1. **Image Capture**: HTML5 `<input type="file" accept="image/*" capture="environment">`
2. **Preprocessing**: OpenCV.js for cropping, contrast, binarization
3. **OCR**: Tesseract.js v6.0.0
4. **Matching**: Scryfall fuzzy name API
5. **Fallback**: Manual name entry if OCR confidence is low

### Why This Approach?

**Pros:**
- Zero cost (no API fees)
- Complete privacy (no images sent to servers)
- No backend infrastructure required
- Works offline after initial load
- Scryfall fuzzy matching handles OCR errors well
- Simple to implement and iterate

**Cons:**
- Lower accuracy than cloud OCR (~70-85% vs 95%+)
- Slower processing (2-5 seconds client-side)
- Requires good lighting/image quality
- May need manual fallback for difficult cards

### Sample Implementation

```javascript
// 1. Capture image from camera
<input type="file" accept="image/*" capture="environment" id="cardPhoto">

// 2. Preprocess with OpenCV.js
const img = cv.imread(canvas);
cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);
cv.threshold(img, img, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

// 3. OCR with Tesseract.js
const { data: { text, confidence } } = await Tesseract.recognize(
  canvas,
  'eng',
  {
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\' ',
    psm: 7 // Treat image as single text line
  }
);

// 4. Fuzzy match with Scryfall
const response = await fetch(
  `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(text)}`
);
const card = await response.json();

// 5. Handle errors gracefully
if (!response.ok) {
  // Show manual entry fallback
}
```

### Expected Accuracy

**70-85% with good photos**
- Requires good lighting
- Card flat against background
- Focus on card name area

## Alternative Approaches

### Option A: Cloud OCR for Higher Accuracy

**Google Cloud Vision** (Recommended if accuracy is critical)

```javascript
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const [result] = await client.textDetection(imageBuffer);
const cardName = result.textAnnotations[0].description.split('\n')[0];

const scryfall = await fetch(
  `https://api.scryfall.com/cards/named?fuzzy=${cardName}`
);
```

**Cost Estimate:**
- 1,000 cards/month = Free
- 5,000 cards/month = $6/month
- Personal use likely stays in free tier

### Option B: Visual Search (Image Similarity)

Instead of OCR, match card images directly:

1. Compute perceptual hash of card photo
2. Compare against Scryfall image database
3. Return closest match

**Pros:**
- Works with any card condition
- Handles foils, foreign languages, misprints
- More robust than OCR

**Cons:**
- Requires downloading entire Scryfall image database
- More complex implementation
- Larger client storage requirements

**Tools:**
- pHash or ImageHash libraries
- Locality-Sensitive Hashing (LSH) for fast lookups

### Option C: Hybrid Approach

1. **Primary**: Tesseract.js OCR + Scryfall fuzzy match
2. **Fallback**: If no match, try visual similarity search
3. **Last Resort**: Manual entry with autocomplete

## Production Recommendations

### Tier 1: Enhanced Client-Side (0-1k users)
- OpenCV.js preprocessing
- Tesseract.js OCR
- Scryfall API fuzzy matching
- Add confidence thresholds
- **Cost**: Free

### Tier 2: Hybrid Approach (1k-10k users)
- Client-side preprocessing (OpenCV.js)
- Cloud OCR for low-confidence cases (Google Vision free tier)
- Scryfall API with rate limiting
- Cache common cards client-side
- **Cost**: $0-50/month

### Tier 3: Production Scale (10k+ users)
- Custom computer vision model (fine-tuned on MTG cards)
- Dedicated backend for processing
- Scryfall bulk data download (update daily)
- Local fuzzy matching with SymSpell
- CDN for cached results
- **Cost**: $100-500/month

## Testing Recommendations

Test with:
- Standard frames (black border cards)
- Modern frames (post-8th Edition)
- Foils (reflective surface)
- Foreign languages (if needed)
- Poor lighting conditions
- Angled photos

## Sources

- [OCR Benchmark: Text Extraction Accuracy 2026](https://research.aimultiple.com/ocr-accuracy/)
- [Google Cloud Vision API](https://cloud.google.com/vision/pricing)
- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js)
- [MTGScan GitHub](https://github.com/fortierq/mtgscan)
- [OpenCV.js Documentation](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [SymSpell GitHub](https://github.com/wolfgarbe/SymSpell)
- [Scryfall API - Fuzzy Name Search](https://scryfall.com/docs/api/cards/named)
- [Survey on Image Preprocessing for OCR](https://medium.com/technovators/survey-on-image-preprocessing-techniques-to-improve-ocr-accuracy-616ddb931b76)
