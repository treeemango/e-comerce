<!-- Copilot / AI agent instructions for the e-comerce workspace -->
# Repository orientation for AI coding agents

This file contains concise, actionable guidance for AI agents working in this repo. Focus on the files and patterns below when changing messaging, realtime, or UI flows.

1. Project type & dev commands
- Framework: React + TypeScript + Vite (see `e-comerce/package.json`).
- Start locally: `npm install` then `npm run dev` (Vite). Build: `npm run build`.
- Environment: `.env.local` (README instructs setting `GEMINI_API_KEY`).

2. High-level architecture
- Frontend: `e-comerce/*` — UI components live in `components/` and top-level `App.tsx`/`index.*`.
- API helpers: `lib/` holds Supabase client (`lib/supabase.ts`), RPC wrappers and helpers (`lib/api.ts`, `lib/attachments-api.ts`).
- Realtime: Supabase realtime channels are used in the UI (see `components/MessagesView.tsx`).

3. Messaging subsystem (important, read before edits)
- Core RPCs (used from `lib/api.ts`):
  - `send_message_and_update_conversation` — called by `sendMessage`.
  - `get_user_conversations`, `get_conversation_messages`, `create_conversation`.
- Defensive mapping: `lib/api.ts` normalizes backend field-name variations (e.g. `id` vs `conversation_id`, `last_message` vs `latest_message_content`). Refer to `getConversations` for examples.
- `sendMessage` behavior:
  - Throws `Error('receiverId is required')` if `receiverId` is falsy. If you see "receiverId is required" in logs, trace the caller to where `receiverId` is computed (see `MessagesView.tsx` selection).
  - Logs input for debugging (`console.log('Sending message:', ...)`) — keep logs when editing to preserve observability.

4. UI patterns to preserve
- Optimistic messages: `MessagesView.tsx` inserts optimistic messages with ids prefixed `temp-<timestamp>`; the real DB ID arrives via Supabase realtime events. Don't remove or change the `temp-` convention without updating the realtime reconciliation logic.
- Pending attachments: files are keyed by message *content* (see `pendingAttachments` Map in `MessagesView.tsx`). The flow:
  1. Add optimistic message (temp id)
  2. Store files in `pendingAttachments` under message content
  3. When realtime INSERT arrives, use the real message ID to upload attachments (`uploadMessageAttachment`) and then fetch them (`getMessageAttachments`).
  Keep this flow intact when changing attachments or message sending code.

5. Realtime subscriptions
- `supabase.channel(
    \`conversation:${id}\`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: 'conversation_id=eq.<id>' }, handler)`
- Handlers are expected to: dedupe by message id, merge optimistic messages, set auto-scroll, and update conversation preview in the sidebar.

6. Debugging tips (concrete)
- If you get `Error: receiverId is required` — open `components/MessagesView.tsx` and inspect how `receiverId` is computed from `selectedConversation.seller_id` / `buyer_id` (lines around `optimisticMessage` creation). Ensure the conversation objects have `seller_id`/`buyer_id` normalized by `lib/api.ts:getConversations`.
- To trace failures in message delivery: enable `console.log` already present in `lib/api.ts` (`Sending message:`) and watch browser console + server logs. The RPCs return `{ error }` — the code throws on error, not silently swallows it.

7. Code conventions & patterns
- RPC wrappers in `lib/api.ts` follow a pattern: call `supabase.rpc('<fn>', params)`, check `error`, normalize `data` to project types, and log on error. Keep this style when adding new RPC calls.
- TypeScript types live in `types.ts` at project root (`e-comerce/types.ts`). Use them when modifying API surfaces.
- Small UI helpers (date/time formatting, skeletons) are in `components/` files — favor small, focused edits.

8. Files to open first (quick checklist)
- `lib/api.ts` — key RPC wrappers + `sendMessage` (messaging rules).
- `components/MessagesView.tsx` — optimistic UI, realtime subscription, attachments flow.
- `lib/attachments-api.ts` — attachment uploads / fetches.
- `lib/supabase.ts` — Supabase client initialization.
- `e-comerce/package.json`, `README.md` — dev commands and environment notes.

If any of the above sections are unclear or you want deeper examples (e.g., exact line references for the optimistic flow or RPC param shapes), tell me which area to expand and I will update this file.
