# AI Assistant Widget: Continuous Conversation, Rich Output, and Box Gating

Single source of truth for planned changes to the chat widget used by `AssistantWidget` and `AgentPanel`.

- Primary UI files:
  - `client/src/components/assistant/AssistantWidget.tsx`
  - `client/src/components/assistant/AgentPanel.tsx`
  - `client/src/components/assistant/BoxPickerModal.tsx`
- API endpoints (existing):
  - `POST /api/ai/query/stream` (SSE streaming)
  - `POST /api/ai/query` (non-streaming fallback)
- Constraints and decisions (from product/memories):
  - Option B (no OpenAI Assistants). Use Vercel AI SDK or manual streaming with chat completions (currently manual SSE path).
  - All users can access Sell and Support modes. Default mode derives from role/dashboard.
  - Sales role has NO access to Box integration. Box is allowed for Service/Admin personas only, via a single BFF.

---

## Goals

1. Continuous conversation: The widget maintains ongoing chat context per user and mode, surviving close/reopen and browser refresh.
2. Properly formatted output: Render assistant responses with Markdown/GFM safely, matching Seed dark theme.
3. Box button visibility: Show "Attach from Box" only in Support mode and only for personas allowed (Service/Admin). Hide in Sell mode.
4. Start new conversation: Provide a clear "Start new" control when a conversation is active; archive/mark end on the server and reset client state.

## Non-goals

- Advanced message types (tables, citations with deep links) beyond current payloads.
- Introducing OpenAI Assistants. We continue with manual chat completions.
- Server-side long-term persistence (database) beyond short-lived Redis cache for conversation context.

---

## Acceptance Criteria

- **[continuous-per-mode]** Chat history persists per user and per mode (`sell` and `support`) when the widget is closed/reopened and on page reload within the session.
- **[stream-smooth]** Streaming appends to the latest assistant message without flickering; no content resets between chunks.
- **[formatting]** Assistant messages display with headings, lists, code blocks, and links using our dark theme styles (no raw Markdown characters visible).
- **[box-visibility]** "Attach from Box" is visible only when mode is `support` AND persona allows Box (Service/Admin). Hidden in `sell`.
- **[server-context]** API accepts `conversationId` and maintains last N messages in Redis (TTL) so that prompts include context.
- **[start-new]** A visible "Start new" control appears when a conversation is active; clicking it ends the current server conversation (sets `endedAt`) and clears client-side state.
- **[rbac-enforced]** BFF rejects Box attachments for disallowed personas with `403` (already supported) and UI handles it gracefully.

---

## UI/UX Spec

- **Container**: Current widget layout retained. Input at bottom, Gary avatar centered.
- **Messages**: Vertical stack, newest at bottom. Auto-scroll to bottom on new chunks.
- **Formatting**: Render Markdown with GFM and sanitized HTML. Use `prose prose-invert` and Tailwind Typography for dark theme.
- **Controls**: Mode switcher adjacent to Ask button. Box button appears above the textarea only when allowed and in Support mode.

---

## Data Model (client)

```ts
export type AgentRole = "user" | "assistant";
export type AgentMode = "sell" | "support";

export interface AgentMessage {
  id: string; // uuid
  role: AgentRole; // 'user' | 'assistant'
  content: string; // markdown text
  attachments?: Array<{ type: "box_file" | "box_folder"; id: string; name?: string }>; // optional
  ts: number; // Date.now()
}

export interface ConversationState {
  conversationId: string; // uuid per mode
  mode: AgentMode; // active mode
  messages: AgentMessage[]; // ordered chat history
}
```

- Storage keys in `sessionStorage`:
  - `ai:conv:<mode>` → `ConversationState` JSON
- On mode switch:
  - Load existing `ai:conv:<mode>` if present; otherwise create new.
  - If switching from `support` → `sell`, clear any staged attachments in the UI.

---

## Client Implementation Plan

1. Message state and persistence
   - Replace `answer` string in `AgentPanel` with `messages: AgentMessage[]` and `conversationId` state.
   - Hydrate from `sessionStorage` on mount based on `initialMode`.
   - Persist to `sessionStorage` on every message mutation.
   - Auto-scroll to bottom when `messages` change.

2. Streaming handling
   - On Ask:
     - Push a user `AgentMessage` with the textarea contents and attachments.
     - Push a placeholder assistant `AgentMessage` with empty content.
     - Call `POST /api/ai/query/stream` with `{ mode, conversationId, message: <userText>, attachments }`.
     - For each `delta` chunk, append to the last assistant message’s `content`.
     - On stream end, persist updated `messages`.
   - Fallback to non-streaming endpoint keeps same behavior (write full assistant message to placeholder).

3. Markdown rendering (proper formatting)
   - Add dependencies: `react-markdown`, `remark-gfm`, `rehype-sanitize`.
   - Render each assistant message with `ReactMarkdown` inside a container styled with Tailwind Typography:
     - `className="prose prose-invert max-w-none text-white/90"`.
     - Ensure links, lists, code blocks, and headings are styled consistently.
   - Sanitize with `rehype-sanitize` to prevent XSS.

4. Box button gating (Support-only + persona)
   - UI condition: render attach button when `mode === 'support' && canUseBox`.
   - On mode change to `sell`:
     - Hide the button.
     - Clear any pending attachments from state.
   - Request body should include `attachments` only when `mode === 'support' && canUseBox`.

5. Minor UX touches
   - Disable Ask button when input is empty or streaming in progress.
   - Show error banner on 403 from BFF (“Access denied. Attachments are not permitted for your role.”).

6. Start new conversation
   - Show a `Start new` button when `conversationId` is present.
   - On click: `POST /api/ai/conversations/end { conversationId }`, then clear local state and unset `conversationId`.
   - Keep mode selection unchanged.

---

## Server Implementation Plan

1. Conversation context in Redis
   - Use existing Redis client to store conversation history keyed by `ai:conv:{userId}:{mode}:{conversationId}`.
   - Value: array of `{ role: 'user'|'assistant', content: string, ts: number }` (attachments omitted in stored history unless needed later).
   - TTL: 2 hours (configurable). Truncate to last 20 messages.

2. API contract changes
   - Extend both endpoints to accept:
     - `conversationId?: string` (server generates if not provided)
     - `mode: 'sell'|'support'`
     - `attachments?: ...` (validated server-side; ignored/403 when persona not allowed)
   - Response for streaming:
     - First event can include `{ meta: { conversationId } }` when server generated a new ID.
     - Subsequent events send `{ delta: string }`.
   - Response for non-streaming:
     - `{ conversationId, answer, citations? }`.

- New endpoint:
- `POST /api/ai/conversations/end { conversationId }` marks the conversation `endedAt` and updates `lastActivityAt`.

3. Prompt construction
   - Read recent history from Redis; build messages array for the model:
     - System: mode-specific instructions (sell vs support) if applicable.
     - History: interleaved user/assistant pairs (last N).
   - New user message.
   - After model response, append assistant message to history and write back to Redis.

4. RBAC enforcement for Box
   - Keep existing behavior: if persona lacks Box permission, return `403` on requests with attachments.
   - Log a clear error for observability.

---

## Rollout Steps

1. Client (phase 1)
   - Implement message state, sessionStorage persistence, Box gating in UI.
   - Switch rendering to `ReactMarkdown` + `remark-gfm` + `rehype-sanitize`.
   - Keep calling existing endpoints with conversationId placeholder (locally generated UUID) but do not require server changes yet.

2. Server (phase 2)
   - Add Redis conversation storage and update endpoints to use history.
   - Stream `{ meta: { conversationId } }` when needed and read conversationId from the request.
   - Persist conversations/messages in Postgres for auditing:
     - Tables: `ai_conversations`, `ai_messages`.
     - Endpoints write user/assistant turns.

3. QA
   - Verify across roles (admin/service/sales):
     - Sales persona: never sees Box in either mode.
     - Service/Admin personas: see Box only in Support mode.
   - Confirm continuous conversation in each mode persists across widget close/reopen and page reload.
   - Confirm Markdown formatting for headings, lists, code blocks.
   - Validate streaming appends properly without flicker.

---

## Work Items (linked to TODOs)

- [ ] Client: chat state + sessionStorage (TODO: `chat_state_client`)
- [ ] Client: streaming append to current assistant message (TODO: `streaming_update`)
- [ ] Client: Markdown rendering with dark theme (TODO: `markdown_render`)
- [ ] Client: Box button render only in Support mode + persona gate (TODO: `box_button_gating`)
- [ ] Client: Start New button and end-conversation flow (TODO: `start_new_button`)
- [ ] Server: conversationId + Redis history (TODO: `api_conversation`)
- [ ] Server: Persist conversations/messages in Postgres (TODO: `db_persistence`)
- [ ] QA pass across roles/modes (TODO: `qa_acceptance`)

---

## Notes / Open Questions

- Do we want separate conversations per mode (recommended) or a single cross-mode thread? Defaulting to per-mode to keep prompts coherent.
- History length and TTL can be tuned based on model token limits and cost. Proposed: last 20 messages, TTL 2 hours.
- If `react-markdown` adds noticeable bundle size, we can lazy-load it for assistant messages only.
- Migration strategy: local dev via `npm run db:push` (reads updated `shared/schema.ts`); production via additive SQL `migrations/0004_ai_conversations_messages.sql` applied with psql.
