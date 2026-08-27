// No-op code signing for electron-builder (Windows, no code-signing certificate
// available in this environment). electron-builder invokes this instead of the
// default winCodeSign flow, so it never downloads/extracts the winCodeSign tools.
module.exports = async function customSign() {
  // Intentionally leave the executable unsigned.
}
