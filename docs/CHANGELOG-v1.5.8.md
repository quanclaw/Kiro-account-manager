# Changelog v1.5.8

## 🐛 Bug Fixes

### Auto-Continue Tool Loop Fix
- **Fixed `400 Improperly formed request` in auto-continue rounds**: Tool definitions were not being forwarded to continuation payloads — the Kiro API requires tools to be present in every request
- **Fixed `ERR_HTTP_HEADERS_SENT` crash**: Stream error handler now checks `res.headersSent` before calling `sendError`, preventing a crash when an auto-continue recursive call fails mid-stream

### Auto-Continue Real Tool Execution
- **Fixed AI looping on same tool call**: Auto-continue now locally executes `read_file` and `list_dir` tool calls and returns their real content instead of a fake `"Done."` response, preventing the AI from re-calling the same tool repeatedly due to missing data
- Both the OpenAI (`/v1/chat/completions`) and Claude (`/v1/messages`) stream handlers are fixed

## 🔧 Technical Changes

### Proxy Server (`src/main/proxy/proxyServer.ts`)
- Added `executeToolLocally()` method that handles `read_file` (with line range support) and `list_dir` locally using `fs`
- Auto-continue `toolResults` now call `executeToolLocally()` instead of hardcoding `"Done. Continue with the next step."`
- Continuation payloads now pass `originalTools` extracted from the original `kiroPayload` instead of `[]`
- Stream error handler guard updated: `if (!hasStarted)` → `if (!hasStarted && !res.headersSent)`

## 📝 Impact
- Agentic tool-use loops (e.g., Kiro IDE agent mode reading files across rounds) now work correctly without crashing or spinning
- `read_file` calls during auto-continue return actual file content, allowing the AI to progress through tasks without re-requesting the same data

---

**Release Date**: March 13, 2026  
**Version**: 1.5.8  
**Previous Version**: 1.5.7
