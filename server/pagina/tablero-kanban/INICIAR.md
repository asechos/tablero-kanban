# Guía completa del proyecto

## 1. Ejecutar la app

```bash
cd server/pagina/tablero-kanban
npm start
# Abrir: http://localhost:7000
```

## 2. Git + GitHub

```bash
# Clonar
git clone https://github.com/asechos/tablero-kanban.git

# Después de cambios locales
git add .
git commit -m "mensaje"
git push
```

## 3. Codespaces (recomendado)

Abrir en navegador: `https://github.dev/asechos/tablero-kanban`

Iniciar la app dentro del codespace:
```bash
cd server/pagina/tablero-kanban
node server.js
```

**URLs públicas automáticas** (fijas mientras exista el codespace):
- `https://<codespace>-7000.app.github.dev` — Kanban
- `https://<codespace>-8443.app.github.dev` — code-server
- `https://<codespace>-<puerto>.app.github.dev` — cualquier otro puerto

Hacer públicos los puertos:
```bash
gh codespace ports visibility 7000:public
```

## 4. Sincronizar local ↔ codespace

Local → `git push` → GitHub → Codespace → `git pull`

O edita directo en `https://github.dev/asechos/tablero-kanban` (sin sincronizar).

## 5. Comandos útiles

```bash
gh auth login                          # Autenticar GitHub CLI
gh repo create <nombre> --public --source=. --push  # Crear repo
gh codespace list                      # Ver codespaces
gh codespace create --repo user/repo   # Crear codespace
gh codespace ports visibility 7000:public  # Exponer puerto
gh codespace ssh --codespace <nombre>  # Conectar por SSH
gh codespace stop --codespace <nombre> # Detener codespace
```
