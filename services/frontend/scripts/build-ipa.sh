#!/usr/bin/env bash
# Build an UNSIGNED GrindLogger .ipa for free sideloading via AltStore/SideStore.
#
# AltStore re-signs the app with your own free Apple ID (and auto-refreshes the
# 7-day signature over WiFi), so we deliberately skip code signing here — that's
# what keeps this path $0 with no Apple Developer Program.
#
# Requires: full Xcode installed, and `npm run ios:add` already run once.
# Output: releases/GrindLogger.ipa
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
WS="ios/App/App.xcworkspace"
BUILD="$ROOT/build-ipa"
OUT="$ROOT/releases"

if [ ! -d "$WS" ]; then
  echo "✗ $WS not found. Run 'npm run ios:add' first (needs full Xcode + CocoaPods)."
  exit 1
fi

echo "▸ Building web bundle + syncing to iOS…"
npm run build
npx cap sync ios

echo "▸ Compiling app (unsigned)…"
rm -rf "$BUILD"
xcodebuild \
  -workspace "$WS" \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath "$BUILD" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  build

APP="$BUILD/Build/Products/Release-iphoneos/App.app"
[ -d "$APP" ] || { echo "✗ App.app not produced"; exit 1; }

echo "▸ Packaging .ipa…"
mkdir -p "$OUT"
rm -rf "$BUILD/Payload" "$OUT/GrindLogger.ipa"
mkdir -p "$BUILD/Payload"
cp -R "$APP" "$BUILD/Payload/"
( cd "$BUILD" && zip -qr "$OUT/GrindLogger.ipa" Payload )

echo ""
echo "✓ Unsigned IPA ready: releases/GrindLogger.ipa"
echo "  Install it with AltStore (My Apps → + → pick this file). AltServer on your"
echo "  Mac then auto-refreshes the signature over WiFi — no weekly re-signing, \$0."
