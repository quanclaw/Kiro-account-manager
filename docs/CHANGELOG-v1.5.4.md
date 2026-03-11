# Changelog v1.5.4

## 🐛 Bug Fixes

### Application Hanging Issue Fixed
- **Fixed application hanging during API requests**: Added timeout handling to all fetch requests to prevent indefinite hangs
- **Added 30-second timeout for streaming requests**: Main chat/completion requests now timeout after 30 seconds
- **Added 15-second timeout for other API calls**: Model fetching, subscription checks, and other API calls timeout after 15 seconds
- **Improved error handling for timeouts**: Timeout errors are now properly caught and logged, allowing fallback to other endpoints

## 🔧 Technical Changes

### API Request Timeout Handling (`src/main/proxy/kiroApi.ts`)
- Added `AbortController` with timeout to `callKiroApiStream` function
- Added timeout handling to `fetchKiroModels` function
- Added timeout handling to `fetchAvailableSubscriptions` function  
- Added timeout handling to `fetchSubscriptionToken` function
- Enhanced error handling to distinguish timeout errors from other failures
- Timeout errors now allow trying alternative endpoints instead of complete failure

## 📝 Impact
- Prevents application from hanging indefinitely on slow or unresponsive API calls
- Improves user experience by providing faster feedback when requests fail
- Better error recovery with automatic fallback to alternative endpoints
- More reliable operation in poor network conditions

---

**Release Date**: March 12, 2026  
**Version**: 1.5.4  
**Previous Version**: 1.5.3