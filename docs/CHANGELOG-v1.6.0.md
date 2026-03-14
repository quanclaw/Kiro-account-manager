# Changelog v1.6.0

## Bug Fixes

### Payload Size Limit
- Added logic to limit Kiro API payload size to 1MB by truncating conversation history and content if needed.
- Prevents timeouts and abort errors when sending large requests to CodeWhisperer or AmazonQ.

## Technical Changes

### Proxy API (`src/main/proxy/kiroApi.ts`)
- Updated `buildKiroPayload` to enforce a 1MB payload limit.
- If the payload exceeds the limit, oldest history messages are removed until under the threshold.
- If still too large, content is truncated to 1000 characters.

## Impact
- Large requests will no longer cause stream timeouts or abort errors.
- More stable and reliable agent API calls for high-volume or long-history sessions.

---

**Release Date**: March 14, 2026  
**Version**: 1.6.0  
**Previous Version**: 1.5.9
