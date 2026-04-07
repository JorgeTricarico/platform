#!/usr/bin/env bash
# setup-engram.sh — Instala engram y restaura memoria en una máquina nueva
# Uso: bash .claude/setup-engram.sh
set -e

ENGRAM_VERSION="1.11.0"
INSTALL_DIR="$HOME/.local/bin"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ Detectando arquitectura..."
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$OS-$ARCH" in
  linux-x86_64)   ASSET="engram_${ENGRAM_VERSION}_linux_amd64.tar.gz" ;;
  linux-arm64|linux-aarch64) ASSET="engram_${ENGRAM_VERSION}_linux_arm64.tar.gz" ;;
  darwin-x86_64)  ASSET="engram_${ENGRAM_VERSION}_darwin_amd64.tar.gz" ;;
  darwin-arm64)   ASSET="engram_${ENGRAM_VERSION}_darwin_arm64.tar.gz" ;;
  *) echo "❌ Arquitectura no soportada: $OS-$ARCH"; exit 1 ;;
esac

if command -v engram &>/dev/null; then
  echo "✓ engram ya instalado: $(engram --version)"
else
  echo "→ Descargando engram v${ENGRAM_VERSION}..."
  mkdir -p "$INSTALL_DIR"
  TMP=$(mktemp -d)
  curl -sL "https://github.com/Gentleman-Programming/engram/releases/download/v${ENGRAM_VERSION}/${ASSET}" -o "$TMP/engram.tar.gz"
  tar -xzf "$TMP/engram.tar.gz" -C "$TMP/"
  mv "$TMP/engram" "$INSTALL_DIR/engram"
  chmod +x "$INSTALL_DIR/engram"
  rm -rf "$TMP"
  echo "✓ engram instalado en $INSTALL_DIR/engram"
fi

# Asegurar que ~/.local/bin esté en PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "⚠️  Agrega esto a tu ~/.bashrc o ~/.zshrc:"
  echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Restaurar memoria desde chunks si existen
CHUNKS_DIR="$REPO_DIR/.engram/chunks"
DB_PATH="$REPO_DIR/.engram/engram.db"

if [ ! -f "$DB_PATH" ] && ls "$CHUNKS_DIR"/*.chunk 2>/dev/null | head -1 &>/dev/null; then
  echo "→ Restaurando memoria desde chunks..."
  ENGRAM_DATA_DIR="$REPO_DIR/.engram" engram sync --import
  echo "✓ Memoria restaurada"
elif [ ! -f "$DB_PATH" ]; then
  echo "→ DB nueva (sin chunks previos)"
  # Inicializar tocando el DB con una búsqueda vacía
  ENGRAM_DATA_DIR="$REPO_DIR/.engram" ENGRAM_PROJECT="platform" engram context platform 2>/dev/null || true
  echo "✓ DB inicializada en $DB_PATH"
else
  echo "✓ DB existente encontrada"
fi

echo ""
echo "✅ Setup completo. Reinicia Claude Code para activar el MCP de engram."
