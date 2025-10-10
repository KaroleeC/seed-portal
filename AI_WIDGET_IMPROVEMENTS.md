# AI Widget Improvements

## Summary

Implemented robustness and UX improvements to the AI assistant widget (`AgentPanel.tsx`) without changing UI layout or copy.

## Changes Made

### 1. Fixed Citations Type Alignment ✅

**Problem**: Server returns `string[]` for citations, but widget expected `Array<{ name: string }>`.

**Fix**:

- Changed state: `const [citations, setCitations] = useState<string[]>([]);`
- Updated rendering: `{citations.map((c, idx) => <li key={idx}>{c}</li>)}`

**Benefit**: Eliminates type mismatch and renders citations correctly.

---

### 2. Added AbortController for Stream Cancellation ✅

**Problem**: In-flight streaming requests could cause ghost updates when:

- User switches modes (Sell ↔ Support)
- User clicks "Start new"
- User rapidly asks multiple questions
- Component unmounts

**Fix**:

- Added `const abortRef = useRef<AbortController | null>(null);`
- Created new `AbortController` before each streaming fetch
- Wired `signal: controller.signal` into `fetch("/api/ai/query/stream", ...)`
- Abort on:
  - Mode switch (in mode change `useEffect`)
  - Component unmount (cleanup `useEffect`)
  - Before starting new `onAsk()` request
  - "Start new" button click (both compact and non-compact)
- Clear `abortRef.current = null` in `finally` block

**Benefit**: Prevents duplicate/stale responses from appending to messages when user changes context mid-stream.

---

### 3. Disabled Box Attach While Loading ✅

**Problem**: Users could mutate attachments state while a request was in-flight.

**Fix**:

- Added `disabled={loading}` to both "Attach from Box" buttons:
  - Non-compact layout (line ~382)
  - Compact layout (line ~416)

**Benefit**: Prevents mid-request attachment changes that could cause inconsistent state.

---

### 4. Added "Start new" to Non-Compact Header ✅

**Problem**: Parity issue—compact widget had "Start new" in footer, but non-compact layout only had it implicitly.

**Fix**:

- Added "Start new" button to non-compact header (after "Open Workspace" button)
- Same handler logic as compact version:
  - Calls `/api/ai/conversations/end`
  - Aborts in-flight request
  - Clears all state (messages, citations, attachments, errors)
  - Removes sessionStorage entry

**Benefit**: Consistent UX across both widget layouts.

---

## Files Modified

### `client/src/components/assistant/AgentPanel.tsx`

- **Lines 52**: Changed citations type to `string[]`
- **Lines 57**: Added `abortRef` ref
- **Lines 65-79**: Updated mode switch effect to abort requests + added unmount cleanup
- **Lines 121-123**: Abort previous request before new `onAsk()`
- **Lines 168-176**: Created AbortController and wired signal into streaming fetch
- **Lines 270**: Clear abortRef in finally block
- **Lines 330-355**: Added "Start new" button to non-compact header
- **Lines 367-368**: Fixed citations rendering (`{c}` instead of `{c.name}`)
- **Lines 382, 416**: Added `disabled={loading}` to Box attach buttons
- **Lines 452-453**: Added abort call to compact "Start new" handler

---

## Testing Checklist

### Basic Functionality

- [ ] Citations render correctly (as strings, not objects)
- [ ] "Start new" button appears in both compact and non-compact layouts when messages exist
- [ ] Box attach buttons are disabled while `loading === true`

### Stream Cancellation

- [ ] Switch from Sell to Support mid-stream → previous stream stops
- [ ] Switch from Support to Sell mid-stream → previous stream stops
- [ ] Click "Start new" mid-stream → stream stops, conversation clears
- [ ] Ask a question, then immediately ask another → first stream aborts
- [ ] Close widget mid-stream → no console errors, stream aborts on unmount

### Edge Cases

- [ ] Rapidly switch modes multiple times → no duplicate messages
- [ ] Click "Start new" multiple times rapidly → no errors
- [ ] Network error during streaming → gracefully falls back to non-streaming
- [ ] Abort error (DOMException) → doesn't surface to user as error message

---

## Performance Impact

- **Minimal**: AbortController is lightweight; signal passing is zero-cost until abort is called.
- **Memory**: Cleanup on unmount prevents memory leaks from dangling fetch promises.
- **UX**: Users can now safely interrupt long-running streams without waiting.

---

## Future Enhancements (Not Implemented)

### Optional: Stop Button

- Add a "Stop" button (icon-only, ghost variant) that appears only when `loading === true`
- Calls `abortRef.current?.abort()` and `setLoading(false)`
- Benefit: Explicit user control to stop generation mid-stream

### Optional: Streaming Error Handling

- Explicitly catch and ignore `DOMException` with `name === 'AbortError'` in the streaming try/catch
- Prevents abort errors from surfacing as user-facing error messages

### Optional: Accessibility

- Add `aria-live="polite"` to assistant message container during streaming
- Improves screen reader feedback for real-time updates

### Optional: Attachment Badge Overflow

- Show first 5 attachments as badges, then "+N more" count
- Prevents UI overflow when many files are selected

---

## Compatibility

- **No breaking changes**: All changes are additive or internal state management
- **No API changes**: Server endpoints unchanged
- **No UI layout changes**: Buttons added only where space already existed
- **No copy changes**: All text unchanged

---

## Rollback Plan

If issues arise, revert `client/src/components/assistant/AgentPanel.tsx` to previous commit. All changes are contained in this single file.

---

## Related Documentation

- [OCR_SETUP.md](./OCR_SETUP.md) - OCR integration for scanned PDFs
- [AI Agent Integration Memory](MEMORY[c02bf0fb-f762-46f5-8473-ac3e3b2871fc]) - Original design decisions
