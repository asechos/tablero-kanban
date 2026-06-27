# Tablero Kanban Interactivo

Aplicación web de tablero Kanban con tres columnas, arrastrar y soltar, duplicar/reutilizar tareas, persistencia en servidor con sincronización en tiempo real entre dispositivos, y exportación/importación de tareas completadas por mes.

## Tecnologías

- HTML5 + CSS3 + JavaScript vanilla
- HTML5 Drag & Drop API nativa (sin dependencias externas)
- Node.js HTTP — API REST + Server-Sent Events (SSE)
- Archivos JSON en servidor para persistencia compartida

## Estructura del proyecto

```
tablero-kanban/
├── data/                  # Datos persistentes en el servidor
│   ├── board.json         # Tablero (pendiente, trabajando, porconfirmar)
│   └── completed.json     # Tareas completadas
├── index.html             # Tablero principal con 3 columnas
├── completados.html       # Página de tareas completadas
├── css/styles.css         # Estilos limpios y modernos
├── js/script.js           # Lógica completa de la aplicación
├── server.js              # Servidor HTTP + API REST + SSE
├── package.json           # Configuración npm
├── install.sh             # Instalador automático (descarga Node.js si falta)
├── pack.sh                # Script para empaquetar en tar.gz
├── README.md              # Este archivo
└── INICIAR.md             # Instrucciones rápidas
```

## Cómo ejecutar

### Requisitos
- Node.js v18 o superior

### Iniciar servidor

```bash
cd tablero-kanban
npm start
# o directamente:
node server.js
```

Abrir en el navegador: `http://localhost:7000`

### Detener servidor
Presionar `Ctrl + C` en la terminal.

### Acceder desde otra PC
En la misma red local usa la IP del servidor:

```
http://192.168.1.100:7000
```

### Exponer con GitHub Codespaces

Este proyecto está hosteado en GitHub y se puede ejecutar en **Codespaces** con URLs públicas automáticas:

1. Abre el repo: `https://github.com/asechos/tablero-kanban`
2. Presiona `.` (punto) o ve a **Code → Create codespace**
3. Inicia la app: `node server/pagina/tablero-kanban/server.js`
4. Codespaces expone el puerto automáticamente

**URLs públicas del codespace:**

- App Kanban → `https://<codespace>-7000.app.github.dev`
- code-server → `https://<codespace>-8443.app.github.dev`

Cada puerto abierto genera su propia URL. Las URLs son fijas mientras no elimines el codespace.

## Funcionalidades

### Tablero (`index.html`)

Tres columnas para organizar tareas:

| Columna | Propósito |
|---|---|
| **Pendiente** | Tareas por hacer |
| **Trabajando** | Tareas en progreso |
| **Por Confirmar** | Tareas terminadas que requieren revisión |

**Acciones en cada tarjeta:**

| Botón | Acción |
|---|---|
| ✎ | Editar texto inline (Enter guarda, Escape cancela) |
| ⧉ | Duplicar la tarjeta justo debajo |
| ✕ | Eliminar tarjeta |
| **Finalizado** | Solo en "Por Confirmar", mueve la tarea a completados |

**Otras acciones:**

- **Añadir tarea** — barra superior con campo de texto y selector de columna
- **Arrastrar y soltar** — mover tarjetas entre columnas y reordenar dentro de cada columna (con indicador visual de posición)
- **Reutilizar** — abre un modal con tareas completadas disponibles para volver a agregar a Pendiente

### Tareas Completadas (`completados.html`)

Las tareas finalizadas se organizan automáticamente por mes.

**Acciones disponibles:**

- **Filtrar por mes** — dropdown con los meses disponibles
- **Exportar mes** — descarga un archivo JSON con las tareas del mes seleccionado
- **Importar** — carga un archivo JSON previamente exportado (sin duplicar tareas)
- **Limpiar** — elimina todas las tareas o solo las del mes seleccionado

## Sincronización en tiempo real

Los datos se almacenan en el servidor (archivos JSON en `data/`), no en el navegador.

- Cualquier cambio hecho desde un dispositivo se guarda en el servidor
- El servidor notifica al instante a todos los clientes conectados mediante **Server-Sent Events (SSE)**
- Todos los navegadores y PCs ven exactamente los mismos datos
- Si la conexión SSE se pierde, se reconecta automáticamente
- Compatible con pestañas, ventanas y dispositivos distintos simultáneamente

## Formato de exportación JSON

```json
{
  "month": "2026-06",
  "exportedAt": "2026-06-26T12:00:00.000Z",
  "tasks": [
    {
      "id": "abc123",
      "text": "Nombre de la tarea",
      "completedAt": "2026-06-15T10:30:00.000Z",
      "month": "2026-06"
    }
  ]
}
```

También se aceptan arrays planos de tareas al importar.

## Flujo de trabajo recomendado

1. Agregar tareas al tablero desde la columna **Pendiente**
2. Arrastrar tareas a **Trabajando** mientras se realizan
3. Arrastrar a **Por Confirmar** cuando están listas para revisión
4. Presionar **Finalizado** para completar la tarea (se asigna automáticamente al mes actual)
5. En la pestaña **Completados**, seleccionar un mes para revisar
6. Al final del mes, usar **Exportar mes** para respaldar
7. Usar **Importar** para recuperar respaldos anteriores
8. Usar **Reutilizar** en el tablero para recuperar tareas completadas anteriores

## Personalización

### Puerto del servidor

Editar `server.js`:

```js
const PORT = 7000;  // cambiar al puerto deseado
```

### Estilos

Modificar `css/styles.css` para cambiar colores, fuentes o distribución.

## Depuración

Al cargar la página aparece un **panel negro en la parte inferior** con logs en tiempo real.

Si ves errores como `fetchBoard status 404`, es porque el proyecto está detrás de un proxy (code-server, nginx, etc.) con un path prefix. La variable `BASE` en `js/script.js:1` detecta automáticamente el path base desde la URL actual.

Para ver errores más detallados, abre la consola del navegador (`F12 → Console`).

## GitHub + Codespaces
