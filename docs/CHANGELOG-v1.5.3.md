# Changelog v1.5.3

## 🐛 Bug Fixes

### Model Selection Issue Fixed
- **Fixed model selection not working properly**: Resolved issue where the application would always default to `claude-sonnet-4.5` regardless of user's model selection in the UI
- **Updated model mapping logic**: Modified the `mapModelId` function to respect user's actual model choice instead of forcing a hardcoded default
- **Improved model fallback behavior**: Changed default fallback from `claude-sonnet-4.5` to `auto` to allow proper model selection

## 🔧 Technical Changes

### Model ID Mapping (`src/main/proxy/kiroApi.ts`)
- Updated `MODEL_ID_MAP.default` from `'claude-sonnet-4.5'` to `'auto'`
- This ensures that when no specific mapping is found, the system uses auto-selection instead of forcing Claude Sonnet 4.5
- Maintains backward compatibility for GPT model aliases and Claude 3.x series mappings

## 📝 Impact
- Users can now properly select different models (Claude Sonnet 4, Claude Haiku 4.5, DeepSeek 3.2, etc.) from the UI
- The selected model will be respected instead of being overridden by the default mapping
- Auto mode now works as expected for optimal model selection

---

**Release Date**: March 12, 2026  
**Version**: 1.5.3  
**Previous Version**: 1.5.2