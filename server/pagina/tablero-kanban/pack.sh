#!/usr/bin/env bash
set -e

ROJO='\033[0;31m'
VERDE='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PROYECTO="tablero-kanban"
VERSION=$(date +%Y%m%d)
ARCHIVO="${PROYECTO}-${VERSION}.tar.gz"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Empaquetando ${PROYECTO}${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

ARCHIVOS=(
  index.html
  completados.html
  css/styles.css
  js/script.js
  server.js
  package.json
  README.md
  INICIAR.md
  install.sh
  pack.sh
)

echo -e "  Archivos incluidos:"
for f in "${ARCHIVOS[@]}"; do
  if [ -f "$f" ]; then
    echo -e "    ${VERDE}✓${NC} $f"
  else
    echo -e "    ${ROJO}✗${NC} $f (no encontrado)"
  fi
done

echo ""

chmod +x install.sh pack.sh 2>/dev/null
tar -czf "$ARCHIVO" --xform="s|^|${PROYECTO}/|" "${ARCHIVOS[@]}" 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "  ${VERDE}✓${NC} Creado: ${CYAN}${ARCHIVO}${NC}"
  echo -e "  ${VERDE}✓${NC} Tamaño: $(du -h "$ARCHIVO" | cut -f1)"
  echo ""
  echo -e "  Para descomprimir en otro equipo:"
  echo -e "    ${CYAN}tar -xzf ${ARCHIVO}${NC}"
  echo -e "    ${CYAN}cd ${PROYECTO}${NC}"
  echo -e "    ${CYAN}./install.sh${NC}"
else
  echo -e "  ${ROJO}✗${NC} Error al crear el archivo"
  exit 1
fi
