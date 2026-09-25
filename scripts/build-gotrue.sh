#!/usr/bin/env bash
# Builds Supabase's login server (GoTrue / "supabase auth") from source into
# .local/gotrue so the app can be developed and end-to-end tested without
# Docker. Needs Go 1.24+ (it will fetch the newer toolchain it asks for).
# On a machine with Docker you can use `supabase start` instead.
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${GOTRUE_REF:-master}"
OUT=.local/gotrue
mkdir -p "$OUT" .local/src
VERSION=$(curl -fsS "https://proxy.golang.org/github.com/supabase/auth/@v/${REF}.info" | sed -E 's/.*"Version":"([^"]+)".*/\1/')
echo "Building supabase/auth ${VERSION}"
curl -fsS -o .local/src/auth.zip "https://proxy.golang.org/github.com/supabase/auth/@v/${VERSION}.zip"
rm -rf .local/src/github.com && (cd .local/src && unzip -q auth.zip)
SRC=".local/src/github.com/supabase/auth@${VERSION}"
chmod -R u+w "$SRC"
# The published module leaves out a vendored fork; the upstream package works.
sed -i '/replace github.com\/joho\/godotenv/d' "$SRC/go.mod"
(cd "$SRC" && go build -mod=mod -o "$OLDPWD/$OUT/gotrue" .)
rm -rf "$OUT/migrations" && cp -r "$SRC/migrations" "$OUT/migrations"
echo "Done: $OUT/gotrue"
