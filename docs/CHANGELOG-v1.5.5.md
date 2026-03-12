# Changelog v1.5.5

## 🐛 Bug Fixes

### OAuth Fingerprint Auto-Generation
- **Fixed missing fingerprint after OAuth login**: Accounts added via Social OAuth flow now always receive and persist a fingerprint
- **Unified fingerprint generation across import/login paths**: Verification and SSO import handlers now return fingerprint data for renderer account creation
- **Prevented empty fingerprint records in account store**: Add Account flows now save returned fingerprint for single login, SSO import, and batch import paths

## 🔧 Technical Changes

### Main Process (`src/main/index.ts`)
- Added centralized `buildAccountFingerprint` helper
- Included fingerprint in `verify-account-credentials` response payload
- Included fingerprint in `import-from-sso-token` response payload

### Renderer & Preload
- Updated Add Account logic to persist `fingerprint` when creating accounts (`src/renderer/src/components/accounts/AddAccountDialog.tsx`)
- Updated preload API typings to include optional `fingerprint` on relevant IPC response types (`src/preload/index.ts`, `src/preload/index.d.ts`)

## 📝 Impact
- OAuth-imported and manually logged-in social accounts now keep a stable fingerprint automatically
- Improves consistency of User-Agent/fingerprint behavior across account sources
- Reduces manual correction for accounts showing “Not generated” in account details

---

**Release Date**: March 12, 2026  
**Version**: 1.5.5  
**Previous Version**: 1.5.4
