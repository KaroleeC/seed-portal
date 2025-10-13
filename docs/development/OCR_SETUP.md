# OCR Integration for Scanned PDFs

## Overview

Google Cloud Vision API has been integrated to automatically extract text from scanned/image-based PDFs when standard PDF text extraction fails.

## How It Works

1. **Primary Extraction**: When a PDF is uploaded, `pdf-parse` attempts to extract text
2. **Scanned PDF Detection**: If extracted text is < 100 chars for files > 50KB, it's flagged as likely scanned
3. **OCR Fallback**: Google Cloud Vision API processes the PDF and extracts text via OCR
4. **Automatic Selection**: The system uses whichever method produces more text

## Configuration

### Service Account

The integration uses the existing `GOOGLE_SERVICE_ACCOUNT_JSON` environment variable (already configured in Doppler for `seed-portal-api`).

The service account (`seed-admin-api@seedportal.iam.gserviceaccount.com`) needs the **Cloud Vision API** enabled:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/vision.googleapis.com?project=seedportal)
2. Ensure "Cloud Vision API" is **enabled** for project `seedportal`
3. No additional permissions needed - the service account already has access

### Verify Setup

```bash
# Check if Vision API is enabled
gcloud services list --enabled --project=seedportal | grep vision

# Enable if needed
gcloud services enable vision.googleapis.com --project=seedportal
```

## Files Modified

### New Files

- **`server/services/ocr.ts`**: OCR service using Google Cloud Vision API
  - `extractTextWithOCR()`: Main OCR function
  - `isLikelyScannedPDF()`: Heuristic to detect scanned PDFs

### Modified Files

- **`server/doc-extract.ts`**: Updated `extractTextFromBuffer()` to:
  - Detect scanned PDFs after initial extraction
  - Fall back to OCR when needed
  - Use OCR as last resort if pdf-parse fails entirely

### Dependencies

- Added: `@google-cloud/vision` (v4.x)

## Usage

### Automatic (Recommended)

The system automatically uses OCR when needed. No code changes required.

### Manual Testing

```typescript
import { extractTextWithOCR } from "./server/services/ocr";

const pdfBuffer = await fs.readFile("scanned.pdf");
const text = await extractTextWithOCR(pdfBuffer, "scanned.pdf");
```

## Logging

Watch for these log messages:

```bash
# Detection
[DocExtract] filename.pdf appears to be scanned, attempting OCR

# Success
[OCR] Extracted 5432 chars from filename.pdf in 3200ms
[DocExtract] OCR successful for filename.pdf, using OCR text

# Fallback
[DocExtract] OCR fallback successful for filename.pdf
```

## Performance

- **Text-based PDFs**: ~50-200ms (pdf-parse only)
- **Scanned PDFs**: ~2-5 seconds (OCR processing)
- **Rate Limits**: Vision API has generous free tier (1000 pages/month)

## Cost

Google Cloud Vision API pricing (as of 2024):

- First 1,000 pages/month: **FREE**
- 1,001-5,000,000 pages: $1.50 per 1,000 pages
- Typical usage: ~10-50 pages/day = **FREE**

## Testing

### Test with Scanned PDFs

1. Hard refresh the app (Cmd+Shift+R)
2. Open assistant in **Support mode**
3. Attach the "2024 financial reports" folder (contains scanned PDFs)
4. Watch logs: `tail -f /tmp/seed-api.log | grep -E "OCR|Indexer"`
5. Ask: "What financial insights can you provide from the 2024 reports?"

Expected logs:

```
[DocExtract] 4. Profit & Loss 2024 % Income.pdf appears to be scanned, attempting OCR
[OCR] Starting OCR for 4. Profit & Loss 2024 % Income.pdf (34499 bytes)
[OCR] Extracted 8234 chars from 4. Profit & Loss 2024 % Income.pdf in 2841ms
[Indexer] Extracted 8234 chars from 4. Profit & Loss 2024 % Income.pdf
[Indexer] Created 3 chunks for 4. Profit & Loss 2024 % Income.pdf
[Indexer] Inserted 3 chunks for 4. Profit & Loss 2024 % Income.pdf
```

### Verify Chunks Created

```bash
doppler run --project seed-portal-api --config dev --command \
  "psql \$DATABASE_URL -c \"SELECT d.name, COUNT(c.id) AS chunks FROM ai_documents d LEFT JOIN ai_chunks c ON c.document_id = d.id GROUP BY d.id, d.name ORDER BY chunks DESC LIMIT 10;\""
```

Should show chunks > 0 for previously failing PDFs.

## Troubleshooting

### OCR Not Working

1. **Check Vision API is enabled**:

   ```bash
   gcloud services list --enabled --project=seedportal | grep vision
   ```

2. **Check service account permissions**:

   ```bash
   gcloud projects get-iam-policy seedportal \
     --flatten="bindings[].members" \
     --filter="bindings.members:seed-admin-api@seedportal.iam.gserviceaccount.com"
   ```

3. **Check logs for errors**:

   ```bash
   tail -f /tmp/seed-api.log | grep -i "ocr\|vision"
   ```

### Common Errors

**"GOOGLE_SERVICE_ACCOUNT_JSON not configured"**

- Service account env var missing (should not happen in Doppler setup)

**"Vision API has not been used in project"**

- Enable the API: `gcloud services enable vision.googleapis.com --project=seedportal`

**"Permission denied"**

- Service account needs `roles/cloudvision.user` or similar
- Add via: `gcloud projects add-iam-policy-binding seedportal --member="serviceAccount:seed-admin-api@seedportal.iam.gserviceaccount.com" --role="roles/cloudvision.user"`

## Next Steps

1. **Enable Vision API** (if not already enabled)
2. **Test with scanned PDFs** following instructions above
3. **Monitor usage** in [Google Cloud Console](https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas?project=seedportal)
4. **Adjust heuristic** if needed (in `ocr.ts` `isLikelyScannedPDF()`)

## Future Enhancements

- Add image format support (PNG, JPG) for direct image uploads
- Implement caching for OCR results (expensive operation)
- Add batch processing for multiple scanned PDFs
- Support for handwritten text detection (Vision API feature)
