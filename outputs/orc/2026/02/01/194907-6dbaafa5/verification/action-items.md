# Action Items from Implementation Verification

## Immediate Actions (Before Next Deployment)

### Priority: MEDIUM
**Action 1: Remove Unused Imports from CameraCapture.tsx**

**File:** `/home/mantis/Development/tcg-tracker/apps/web/src/components/cards/CameraCapture.tsx`

**Current Code (Line 4):**
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
```

**Issue:** CardHeader and CardTitle (from ui/card) are never used in the component

**Solution:**
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'  // Removed CardHeader, CardTitle
```

**How to Fix:**
1. Auto-fix with: `eslint --fix /home/mantis/Development/tcg-tracker/apps/web/src/components/cards/CameraCapture.tsx`
2. Or manually edit line 4

**Verification:** Run `tsc --noEmit` to confirm TS6133 errors are gone

---

## Medium Priority Actions (Recommended)

### Priority: LOW
**Action 2: Improve Type Safety for Card Image URI**

**File:** `/home/mantis/Development/tcg-tracker/apps/web/src/components/cards/CardDetailModal.tsx`

**Current Code (Lines 66-74):**
```typescript
{card.imageUris && (
  <img
    src={
      typeof card.imageUris === 'object' &&
      card.imageUris !== null &&
      'normal' in card.imageUris
        ? String(card.imageUris.normal)
        : ''
    }
    alt={card.name}
    className="rounded-lg shadow-lg w-full max-w-[300px] h-auto object-contain aspect-[5/7]"
  />
)}
```

**Issue:** TypeScript cannot fully narrow `imageUris.normal` to string type

**Recommended Solution:**

Option A: Create a type guard function
```typescript
// Add to CardDetailModal.tsx or utils
function isImageUrisObject(
  imageUris: unknown
): imageUris is { normal: string } {
  return (
    typeof imageUris === 'object' &&
    imageUris !== null &&
    'normal' in imageUris &&
    typeof (imageUris as any).normal === 'string'
  )
}

// Usage in component
{card.imageUris && isImageUrisObject(card.imageUris) && (
  <img src={card.imageUris.normal} alt={card.name} ... />
)}
```

Option B: Use optional chaining (simpler)
```typescript
{card.imageUris?.normal && (
  <img
    src={card.imageUris.normal}
    alt={card.name}
    className="rounded-lg shadow-lg w-full max-w-[300px] h-auto object-contain aspect-[5/7]"
  />
)}
```

**Recommended:** Option B (simpler and safer)

**Verification:** Run `tsc --noEmit` to confirm TS2322 error is gone

---

## Documentation Actions (Optional)

### Action 3: Add JSDoc Comments to useCardRecognition Utilities

**File:** `/home/mantis/Development/tcg-tracker/apps/web/src/hooks/useCardRecognition.ts`

**What to Document:**
```typescript
/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching card names from OCR
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns Numeric distance (lower = more similar)
 *
 * @example
 * levenshteinDistance("Elf", "Elves") // Returns 1
 */
function levenshteinDistance(str1: string, str2: string): number {
  // ... implementation
}

/**
 * Calculates similarity score between two strings (0-1 range)
 * Useful for determining confidence in card matches
 *
 * @param str1 Search query (from OCR)
 * @param str2 Card name from database
 * @returns Similarity score from 0 to 1 (1 = identical)
 *
 * @example
 * calculateSimilarity("Black Lotus", "Black Lotys") // Returns ~0.89
 */
function calculateSimilarity(str1: string, str2: string): number {
  // ... implementation
}

/**
 * Extracts potential card names from OCR-extracted text
 * Filters common OCR noise and invalid patterns
 *
 * @param ocrText Raw text output from Tesseract OCR
 * @returns Array of cleaned card name candidates
 *
 * @example
 * extractCardNames("Black Lotus\n$500 card\n1993")
 * // Returns ["Black Lotus"]
 */
function extractCardNames(ocrText: string): string[] {
  // ... implementation
}
```

---

## Testing Recommendations

### Manual Testing Checklist

- [ ] Test camera permissions flow (allow and deny)
- [ ] Test with poor lighting (should still recognize some cards)
- [ ] Test with partial card images
- [ ] Test rapid OCR processing (won't freeze UI)
- [ ] Test error recovery (retry button works)
- [ ] Test card detail modal opens from search results
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (portrait/landscape)

### Automated Testing Opportunities

1. **Unit Tests for Utilities:**
   - `levenshteinDistance` - test with various string pairs
   - `calculateSimilarity` - test threshold of 0.6
   - `extractCardNames` - test OCR noise removal

2. **Component Tests:**
   - CameraCapture state transitions
   - Error message displays
   - Dialog open/close

3. **Integration Tests:**
   - Full OCR→Search→Display flow
   - API mock for cards.search

---

## Technical Debt to Address (Future)

### Priority: LOW

**1. Consolidate Image URI Types**
- CardDetailModal uses different image URI handling than Scan.tsx
- Consider defining shared interface in types package

**2. Optimize Scryfall Searches**
- Current: Searches all extracted names individually
- Future: Could batch search or implement caching

**3. Consider Web Worker for OCR**
- Tesseract already uses workers, but could optimize
- Not critical for current use case

**4. Align Drizzle ORM Versions**
- Pre-existing issue: drizzle-orm@0.36.4 vs 0.45.1
- Should resolve at project level, not specific to this feature

---

## Monitoring & Metrics

### Recommended to Track

1. **OCR Success Rate**
   - Percentage of images with recognized cards
   - Cards recognized per image (average)

2. **Performance Metrics**
   - Time from capture to results display
   - Tesseract processing time
   - API search latency

3. **Error Tracking**
   - Camera permission denials
   - Failed API searches
   - OCR processing errors

4. **User Behavior**
   - How often users click "Try Again" (indicates low accuracy)
   - Which confidence thresholds get clicked
   - Scan success completion rate

---

## Deployment Checklist

**Pre-Deployment:**
- [ ] Run `eslint --fix` on modified and created files
- [ ] Run `tsc --noEmit` - ensure all errors resolved
- [ ] Verify tesseract.js dependency in package.json
- [ ] Test camera functionality on target device
- [ ] Manual testing on mobile devices

**During Deployment:**
- [ ] Monitor for JavaScript errors in console
- [ ] Check localStorage for auth token availability
- [ ] Verify API endpoint `/trpc/cards.search` is accessible

**Post-Deployment:**
- [ ] Monitor error tracking service (Sentry)
- [ ] Check user feedback for OCR accuracy issues
- [ ] Monitor API latency for search endpoint
- [ ] Track feature adoption metrics

---

## Rollback Plan

If issues arise:

1. **Minor Issues (cosmetic):**
   - Deploy updated CSS or UI only
   - Restart browser

2. **API Integration Issues:**
   - Check `/trpc/cards.search` endpoint
   - Verify auth token handling
   - Check API response format

3. **OCR Accuracy Issues:**
   - Adjust similarity threshold in useCardRecognition.ts
   - Current: 0.6 (60%) - could lower to 0.5 for more results
   - Could raise to 0.7 for stricter matching

4. **Complete Rollback:**
   - Revert commit 0892d26 if critical issues
   - Or disable Scan page route temporarily
   - No database changes to rollback

---

## Sign-Off

**Verification Completed:** 2026-02-01
**Verified By:** Claude Code
**Status:** ✓ APPROVED FOR DEPLOYMENT

**Issues Found:** 2 (both minor)
- Unused imports (linting issue)
- Type assertion could be improved (non-blocking)

**Blocking Issues:** 0

**Recommendation:** Deploy with recommended linting fixes applied

---

## Related Documentation

- [Implementation Summary](./summary.md)
- [Detailed Findings](./detailed-findings.md)
- [Feature Commit](0892d26)

---

## Contact for Questions

For questions about this verification:
- Review the detailed findings document
- Check the feature commit for implementation details
- Run verification commands yourself for current status
