# Changelog v1.5.9

## Bug Fixes

### Proxy Stream Interruption
- Fixed OpenAI stream completion behavior in proxy mode: the server now explicitly ends SSE responses after sending `data: [DONE]`
- Prevented false user-cancel detection after normal stream completion, which could block the immediate follow-up tool-result request and interrupt agent workflows
- Resolved the issue where chat execution appeared to be interrupted during background auto-refresh timing

## Technical Changes

### Proxy Server (`src/main/proxy/proxyServer.ts`)
- Added `res.end()` in OpenAI stream success path after final SSE chunk and `[DONE]`
- Added `res.end()` in OpenAI stream error path after final SSE chunk and `[DONE]`
- This aligns OpenAI stream shutdown behavior with the Claude stream handler

## Impact
- Tool-use chains continue reliably after each stream turn
- No accidental 499 cancellation response caused by normal stream closure
- More stable long-running agent sessions while background refresh tasks are active

---

**Release Date**: March 13, 2026  
**Version**: 1.5.9  
**Previous Version**: 1.5.8
