#!/usr/bin/env bash
set -e

ROJO='\033[0;31m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Tablero Kanban - Instalador automatico${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# --------------- Detectar arquitectura ---------------
detectar_arch() {
  case $(uname -m) in
    x86_64)  echo "x64" ;;
    aarch64) echo "arm64" ;;
    armv7l)  echo "armv7l" ;;
    *)
      echo -e "  ${ROJO}✗${NC} Arquitectura no soportada: $(uname -m)"
      exit 1
      ;;
  esac
}

# --------------- Instalar Node.js ---------------
instalar_nodejs() {
  local arch
  arch=$(detectar_arch)
  local ver="v22.14.0"
  local file="node-${ver}-linux-${arch}"
  local url="https://nodejs.org/dist/${ver}/${file}.tar.gz"
  local dest="$HOME/.local/nodejs"

  echo -e "  ${AMARILLO}↻${NC} Descargando Node.js ${ver} para ${arch}..."

  rm -rf "$dest"
  mkdir -p "$dest"

  if command -v curl &>/dev/null; then
    curl -fsSL "$url" | tar -xzf - -C "$dest" --strip-components=1
  elif command -v wget &>/dev/null; then
    wget -q -O - "$url" | tar -xzf - -C "$dest" --strip-components=1
  else
    echo -e "  ${ROJO}✗${NC} No se encontro curl ni wget. Instala uno de ellos e intenta de nuevo."
    exit 1
  fi

  export PATH="$dest/bin:$PATH"

  if ! grep -q "$dest/bin" "$HOME/.bashrc" 2>/dev/null; then
    echo "" >> "$HOME/.bashrc"
    echo "# Node.js (instalado por tablero-kanban)" >> "$HOME/.bashrc"
    echo "export PATH=\"$dest/bin:\$PATH\"" >> "$HOME/.bashrc"
  fi

  echo -e "  ${VERDE}✓${NC} Node.js $(node --version) instalado en ~/.local/nodejs"
  echo -e "  ${VERDE}✓${NC} Agregado al PATH en ~/.bashrc"
}

# --------------- Verificar Node.js ---------------
echo -e "${AMARILLO}[1/4] Verificando Node.js...${NC}"

if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -ge 18 ] 2>/dev/null; then
    echo -e "  ${VERDE}✓${NC} Node.js $(node --version) detectado"
  else
    echo -e "  ${ROJO}✗${NC} Se requiere Node.js v18 o superior (tienes $(node --version))"
    echo -e "  Actualizalo manualmente o borra ~/.local/nodejs y ejecuta este script de nuevo"
    exit 1
  fi
else
  echo -e "  ${AMARILLO}⚠${NC} Node.js no encontrado. Instalando automaticamente..."
  instalar_nodejs
fi

# --------------- Directorio del proyecto ---------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${AMARILLO}[2/4] Preparando estructura...${NC}"

mkdir -p data css js

if [ ! -f "data/board.json" ]; then
  echo '{"pendiente":[],"trabajando":[],"porconfirmar":[]}' > data/board.json
  echo -e "  ${VERDE}✓${NC} Creado data/board.json"
fi

if [ ! -f "data/completed.json" ]; then
  echo '[]' > data/completed.json
  echo -e "  ${VERDE}✓${NC} Creado data/completed.json"
fi

echo -e "  ${VERDE}✓${NC} Directorios listos"

# --------------- Puerto ---------------
echo -e "${AMARILLO}[3/4] Verificando puerto...${NC}"

PORT=7000
puerto_ocupado() { lsof -i :"$1" &>/dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":$1 "; }

if puerto_ocupado $PORT; then
  echo -e "  ${AMARILLO}⚠${NC} Puerto $PORT en uso, buscando otro..."
  for try in 7001 7002 7003 7004 7005; do
    if ! puerto_ocupado $try; then
      PORT=$try
      break
    fi
  done
  echo -e "  ${VERDE}✓${NC} Usando puerto $PORT"
else
  echo -e "  ${VERDE}✓${NC} Puerto $PORT disponible"
fi

# --------------- Iniciar ---------------
echo ""
echo -e "${VERDE}========================================${NC}"
echo -e "${VERDE}  Instalacion completada${NC}"
echo -e "${VERDE}========================================${NC}"
echo ""
echo -e "  Para iniciar el servidor ejecuta:"
echo -e "    ${CYAN}node server.js${NC}"
echo ""
echo -e "  Luego abre en tu navegador:"
echo -e "    ${CYAN}http://localhost:${PORT}${NC}"
echo ""
echo -e "  Para acceder desde otra PC en la misma red:"
echo -e "    ${CYAN}http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}${NC}"
echo ""

# Preguntar si quiere iniciar ahora
read -p "  ¿Iniciar el servidor ahora? (s/N): " INICIAR
if [ "$INICIAR" = "s" ] || [ "$INICIAR" = "S" ]; then
  echo ""
  echo -e "  ${CYAN}Servidor corriendo en http://localhost:${PORT}${NC}"
  echo -e "  Presiona ${ROJO}Ctrl+C${NC} para detenerlo"
  echo ""
  node server.js
fi
