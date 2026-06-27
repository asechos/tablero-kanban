const BASE = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
const API_BOARD = BASE + 'api/board';
const API_COMPLETED = BASE + 'api/completed';
const API_EVENTS = BASE + 'api/events';

let dragData = null;
let selectedMonth = 'todos';
let boardCache = null;
let completedCache = null;
let currentVersion = 0;

function log(...args) {
  console.log('[Kanban]', ...args);
}
function logError(...args) {
  console.error('[Kanban ERROR]', ...args);
  const el = document.getElementById('debugLog');
  if (el) {
    const msg = document.createElement('div');
    msg.textContent = args.map(a => typeof a === 'object' ? (a?.message || a?.stack || JSON.stringify(a)) : String(a)).join(' ');
    el.appendChild(msg);
    el.scrollTop = el.scrollHeight;
  }
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'todos') return 'Todos los meses';
  const [year, month] = monthKey.split('-');
  return `${MONTHS_ES[parseInt(month) - 1]} ${year}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ==================== DATA LAYER ==================== */

async function fetchBoard() {
  log('fetchBoard()');
  const res = await fetch(API_BOARD);
  if (!res.ok) throw new Error('fetchBoard status ' + res.status);
  boardCache = await res.json();
  log('fetchBoard() OK, tasks:', Object.values(boardCache).reduce((a, c) => a + c.length, 0));
  return boardCache;
}

async function saveBoard(data) {
  log('saveBoard()');
  boardCache = data;
  const res = await fetch(API_BOARD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('saveBoard status ' + res.status);
  log('saveBoard() OK');
}

async function fetchCompleted() {
  log('fetchCompleted()');
  const res = await fetch(API_COMPLETED);
  if (!res.ok) throw new Error('fetchCompleted status ' + res.status);
  completedCache = await res.json();
  log('fetchCompleted() OK, count:', completedCache.length);
  return completedCache;
}

async function saveCompleted(data) {
  log('saveCompleted()');
  completedCache = data;
  const res = await fetch(API_COMPLETED, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('saveCompleted status ' + res.status);
  log('saveCompleted() OK');
}

/* ==================== SSE ==================== */

function connectSSE() {
  const source = new EventSource(API_EVENTS);
  source.onmessage = (e) => {
    const v = parseInt(e.data);
    if (v > currentVersion) {
      currentVersion = v;
      if (isBoardPage()) refetchAndRenderBoard();
      if (isCompletedPage()) refetchAndRenderCompleted();
    }
  };
  source.onerror = () => {
    source.close();
    setTimeout(connectSSE, 2000);
  };
}

/* ==================== MIGRACION ==================== */

async function migrateFromLocalStorage() {
  let boardRaw, completedRaw;
  try {
    boardRaw = localStorage.getItem('kanban_board');
    completedRaw = localStorage.getItem('kanban_completed');
    log('localStorage access OK');
  } catch (e) {
    logError('localStorage access FAILED:', e);
    return;
  }

  let migrated = false;

  if (boardRaw) {
    try {
      const data = JSON.parse(boardRaw);
      await saveBoard(data);
      localStorage.removeItem('kanban_board');
      migrated = true;
    } catch { /* ignore */ }
  }

  if (completedRaw) {
    try {
      const data = JSON.parse(completedRaw);
      await saveCompleted(data);
      localStorage.removeItem('kanban_completed');
      migrated = true;
    } catch { /* ignore */ }
  }

  if (migrated) {
    try { localStorage.removeItem('kanban_completed_ts'); } catch { /* ignore */ }
  }
}

/* ==================== BOARD PAGE ==================== */

function isBoardPage() {
  return !!document.querySelector('.board');
}

async function refetchAndRenderBoard() {
  await fetchBoard();
  renderBoardFromCache();
}

function renderBoardFromCache() {
  if (!boardCache) return;
  const data = boardCache;
  document.querySelectorAll('.column').forEach((col) => {
    const columnName = col.dataset.column;
    const body = col.querySelector('.column-body');
    const countEl = col.querySelector('.task-count');
    const tasks = data[columnName] || [];
    body.innerHTML = '';
    tasks.forEach((task) => {
      body.appendChild(createCardElement(task, columnName));
    });
    countEl.textContent = tasks.length;
  });
}

async function renderBoard() {
  await fetchBoard();
  renderBoardFromCache();
}

function createCardElement(task, column) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  const textSpan = document.createElement('span');
  textSpan.className = 'card-text';
  textSpan.textContent = task.text;
  card.appendChild(textSpan);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.title = 'Editar';
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startEditing(card, task, column);
  });
  actions.appendChild(editBtn);

  const duplicateBtn = document.createElement('button');
  duplicateBtn.className = 'btn-duplicate';
  duplicateBtn.title = 'Duplicar';
  duplicateBtn.textContent = '⧉';
  duplicateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    duplicateTask(task, column);
  });
  actions.appendChild(duplicateBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.title = 'Eliminar';
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id, column);
  });
  actions.appendChild(deleteBtn);

  if (column === 'porconfirmar') {
    const finalizeBtn = document.createElement('button');
    finalizeBtn.className = 'btn-finalize';
    finalizeBtn.textContent = 'Finalizado';
    finalizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      completeTask(task.id);
    });
    actions.appendChild(finalizeBtn);
  }

  card.appendChild(actions);

  card.addEventListener('dragstart', (e) => onDragStart(e, task.id, column));
  card.addEventListener('dragend', onDragEnd);

  return card;
}

/* ==================== DUPLICATE TASK ==================== */

async function duplicateTask(task, column) {
  const data = boardCache || await fetchBoard();
  const idx = data[column].findIndex((t) => t.id === task.id);
  if (idx === -1) return;
  const newTask = { id: genId(), text: task.text };
  data[column].splice(idx + 1, 0, newTask);
  await saveBoard(data);
  renderBoardFromCache();
}

/* ==================== ADD TASK ==================== */

async function addTask() {
  log('addTask()');
  const input = document.getElementById('newTaskInput');
  const select = document.getElementById('columnSelect');
  if (!input || !select) {
    logError('addTask: input o select no encontrados');
    return;
  }
  const text = input.value.trim();
  if (!text) return;

  const column = select.value;
  try {
    const data = boardCache || await fetchBoard();
    data[column].push({ id: genId(), text });
    await saveBoard(data);
    renderBoardFromCache();
    input.value = '';
    input.focus();
    log('addTask() OK');
  } catch (e) {
    logError('addTask() failed:', e);
  }
}

/* ==================== DELETE TASK ==================== */

async function deleteTask(id, column) {
  const data = boardCache || await fetchBoard();
  data[column] = data[column].filter((t) => t.id !== id);
  await saveBoard(data);
  renderBoardFromCache();
}

/* ==================== EDIT TASK ==================== */

function startEditing(card, task, column) {
  const textEl = card.querySelector('.card-text');
  const originalText = task.text;

  card.classList.add('is-editing');
  textEl.contentEditable = true;
  textEl.focus();

  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(textEl);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  async function finishEditing(save) {
    card.classList.remove('is-editing');
    textEl.contentEditable = false;
    const newText = textEl.textContent.trim();

    if (save && newText && newText !== originalText) {
      const data = boardCache || await fetchBoard();
      const found = data[column].find((t) => t.id === task.id);
      if (found) {
        found.text = newText;
        await saveBoard(data);
      }
      textEl.textContent = newText;
    } else {
      textEl.textContent = originalText;
    }
  }

  textEl.addEventListener('keydown', function handler(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing(true);
      textEl.removeEventListener('keydown', handler);
    }
    if (e.key === 'Escape') {
      finishEditing(false);
      textEl.removeEventListener('keydown', handler);
    }
  });

  textEl.addEventListener('blur', () => {
    finishEditing(true);
  }, { once: true });
}

/* ==================== COMPLETE TASK ==================== */

async function completeTask(id) {
  const data = boardCache || await fetchBoard();
  const tasks = data.porconfirmar;
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const task = tasks.splice(idx, 1)[0];
  await saveBoard(data);

  const now = new Date();
  const completed = completedCache || await fetchCompleted();
  completed.push({
    id: task.id,
    text: task.text,
    completedAt: now.toISOString(),
    month: getMonthKey(now),
  });
  await saveCompleted(completed);

  renderBoardFromCache();
}

/* ==================== DRAG & DROP ==================== */

function onDragStart(e, id, column) {
  dragData = { id, sourceColumn: column };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  setTimeout(() => {
    e.target.classList.add('dragging');
  }, 0);
}

function onDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.column-body').forEach((el) => el.classList.remove('drag-over'));
  document.querySelectorAll('.drag-indicator').forEach((el) => el.remove());
}

function getDropIndex(columnBody, y) {
  const cards = columnBody.querySelectorAll('.card:not(.drag-indicator)');
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (y < mid) return i;
  }
  return cards.length;
}

function showDragIndicator(columnBody, index) {
  columnBody.querySelectorAll('.drag-indicator').forEach((el) => el.remove());
  const cards = columnBody.querySelectorAll('.card:not(.drag-indicator)');
  const indicator = document.createElement('div');
  indicator.className = 'card drag-indicator';
  if (index >= cards.length) {
    columnBody.appendChild(indicator);
  } else if (index <= 0) {
    columnBody.insertBefore(indicator, cards[0]);
  } else {
    columnBody.insertBefore(indicator, cards[index]);
  }
}

function initDragDrop() {
  document.querySelectorAll('.column-body').forEach((body) => {
    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      body.classList.add('drag-over');
      const index = getDropIndex(body, e.clientY);
      showDragIndicator(body, index);
    });

    body.addEventListener('dragleave', (e) => {
      if (!body.contains(e.relatedTarget)) {
        body.classList.remove('drag-over');
      }
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      body.classList.remove('drag-over');
      body.querySelectorAll('.drag-indicator').forEach((el) => el.remove());

      if (!dragData) return;

      const targetColumn = body.closest('.column').dataset.column;
      const dropIndex = getDropIndex(body, e.clientY);
      const data = boardCache || await fetchBoard();

      const sourceTasks = data[dragData.sourceColumn];
      const taskIdx = sourceTasks.findIndex((t) => t.id === dragData.id);
      if (taskIdx === -1) return;

      const [task] = sourceTasks.splice(taskIdx, 1);

      if (dragData.sourceColumn !== targetColumn) {
        const targetTasks = data[targetColumn];
        targetTasks.splice(dropIndex, 0, task);
      } else {
        let adjustedIndex = dropIndex;
        if (taskIdx < dropIndex) adjustedIndex--;
        sourceTasks.splice(adjustedIndex, 0, task);
      }

      dragData = null;
      await saveBoard(data);
      renderBoardFromCache();
    });
  });
}

/* ==================== COMPLETED PAGE ==================== */

function isCompletedPage() {
  return !!document.querySelector('.completed-list');
}

function ensureMonthField(task) {
  if (!task.month && task.completedAt) {
    task.month = getMonthKey(task.completedAt);
  }
  return task;
}

function getAvailableMonths(tasks) {
  const months = new Set();
  tasks.forEach((t) => {
    ensureMonthField(t);
    if (t.month) months.add(t.month);
  });
  return Array.from(months).sort().reverse();
}

function renderMonthSelector() {
  const select = document.getElementById('monthSelect');
  if (!select) return;

  const completed = completedCache || [];
  const months = getAvailableMonths(completed);
  const currentMonth = getMonthKey(new Date());

  select.innerHTML = '<option value="todos">Todos los meses</option>';
  months.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = getMonthLabel(m);
    select.appendChild(opt);
  });

  if (!selectedMonth || selectedMonth === 'todos') {
    selectedMonth = months.includes(currentMonth) ? currentMonth : 'todos';
  } else if (!months.includes(selectedMonth)) {
    selectedMonth = 'todos';
  }

  select.value = selectedMonth;
}

async function refetchAndRenderCompleted() {
  await fetchCompleted();
  renderCompletedFromCache();
}

function renderCompletedFromCache() {
  const completed = completedCache || [];
  const list = document.querySelector('.completed-list');
  const empty = document.querySelector('.empty-message');
  const summary = document.getElementById('monthSummary');

  if (!list) return;

  renderMonthSelector();

  let filtered = completed.map(ensureMonthField);
  if (selectedMonth !== 'todos') {
    filtered = filtered.filter((t) => t.month === selectedMonth);
  }
  filtered.reverse();

  list.innerHTML = '';

  if (completed.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    if (summary) summary.textContent = '';
    return;
  }

  list.style.display = 'grid';
  empty.style.display = 'none';

  if (summary) {
    const label = getMonthLabel(selectedMonth);
    const count = filtered.length;
    const total = completed.length;
    summary.textContent = `${label} — ${count} tarea${count !== 1 ? 's' : ''}${selectedMonth !== 'todos' ? ` (${total} en total)` : ''}`;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-filtered">No hay tareas en este mes.</div>';
    list.style.display = 'block';
    return;
  }

  filtered.forEach((task) => {
    const item = document.createElement('div');
    item.className = 'completed-item completed-lime';

    const info = document.createElement('div');
    info.style.flex = '1';

    const text = document.createElement('div');
    text.className = 'completed-text';
    text.textContent = task.text;
    info.appendChild(text);

    const date = document.createElement('div');
    date.className = 'completed-date';
    date.textContent = 'Completado: ' + formatDate(task.completedAt);
    info.appendChild(date);

    item.appendChild(info);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-completed';
    delBtn.textContent = '✕';
    delBtn.title = 'Eliminar';
    delBtn.addEventListener('click', async () => {
      const list2 = completedCache || await fetchCompleted();
      const updated = list2.filter((t) => t.id !== task.id);
      await saveCompleted(updated);
      renderCompletedFromCache();
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

async function renderCompleted() {
  await fetchCompleted();
  renderCompletedFromCache();
}

/* ==================== EXPORT / IMPORT ==================== */

async function exportMonth() {
  const completed = completedCache || await fetchCompleted();
  const month = selectedMonth;

  const tasks = month === 'todos'
    ? completed
    : completed.filter((t) => t.month === month);

  if (tasks.length === 0) {
    alert('No hay tareas para exportar.');
    return;
  }

  const blob = new Blob([JSON.stringify({
    month: month === 'todos' ? 'todos' : month,
    exportedAt: new Date().toISOString(),
    tasks,
  }, null, 2)], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = month === 'todos' ? 'completadas-todas.json' : `completadas-${month}.json`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importTasks(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let imported = [];

      if (Array.isArray(data)) {
        imported = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        imported = data.tasks;
      } else {
        alert('Formato de archivo no valido. Debe ser un array de tareas o un objeto con clave "tasks".');
        return;
      }

      imported = imported.map(ensureMonthField);

      const existing = completedCache || await fetchCompleted();
      const existingIds = new Set(existing.map((t) => t.id));
      let added = 0;

      imported.forEach((task) => {
        if (!existingIds.has(task.id)) {
          if (!task.id) task.id = genId();
          if (!task.completedAt) task.completedAt = new Date().toISOString();
          if (!task.month) task.month = getMonthKey(task.completedAt);
          existing.push(task);
          existingIds.add(task.id);
          added++;
        }
      });

      await saveCompleted(existing);
      renderCompletedFromCache();
      alert(`Importacion completada: ${added} tarea${added !== 1 ? 's' : ''} añadida${added !== 1 ? 's' : ''}.`);
    } catch {
      alert('Error al leer el archivo. Asegurate de que sea un JSON valido.');
    }
  };
  reader.readAsText(file);
}

/* ==================== REUSE DIALOG ==================== */

async function openReuseDialog() {
  const modal = document.getElementById('reuseModal');
  const body = document.getElementById('reuseBody');
  const completed = completedCache || await fetchCompleted();
  modal.classList.remove('hidden');

  if (completed.length === 0) {
    body.innerHTML = '<div class="reuse-empty">No hay tareas completadas para reutilizar.</div>';
    return;
  }

  body.innerHTML = '';
  [...completed].reverse().forEach((task) => {
    const item = document.createElement('div');
    item.className = 'reuse-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'reuse-' + task.id;
    cb.value = task.id;

    const label = document.createElement('label');
    label.htmlFor = 'reuse-' + task.id;
    label.textContent = task.text;

    const date = document.createElement('span');
    date.className = 'reuse-date';
    date.textContent = formatDate(task.completedAt);

    item.appendChild(cb);
    item.appendChild(label);
    item.appendChild(date);
    body.appendChild(item);
  });
}

function closeReuseDialog() {
  document.getElementById('reuseModal').classList.add('hidden');
}

async function confirmReuse() {
  const checked = document.querySelectorAll('#reuseBody input[type="checkbox"]:checked');
  if (checked.length === 0) {
    alert('Selecciona al menos una tarea.');
    return;
  }

  const completed = completedCache || await fetchCompleted();
  const data = boardCache || await fetchBoard();
  const idsToRemove = new Set();

  checked.forEach((cb) => {
    idsToRemove.add(cb.value);
    const task = completed.find((t) => t.id === cb.value);
    if (task) {
      data.pendiente.push({ id: genId(), text: task.text });
    }
  });

  const updated = completed.filter((t) => !idsToRemove.has(t.id));
  await saveCompleted(updated);
  await saveBoard(data);
  closeReuseDialog();
  renderBoardFromCache();
}

/* ==================== INIT ==================== */

async function init() {
  log('init() - starting');
  try {
    await migrateFromLocalStorage();
    log('init() - migrateFromLocalStorage OK');
  } catch (e) {
    logError('migrateFromLocalStorage failed:', e);
  }

  if (isBoardPage()) {
    log('init() - isBoardPage = true');
    try {
      await renderBoard();
      log('init() - renderBoard OK');
    } catch (e) {
      logError('renderBoard failed:', e);
    }
    initDragDrop();

    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('newTaskInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });

    const reuseBtn = document.getElementById('reuseBtn');
    if (reuseBtn) reuseBtn.addEventListener('click', openReuseDialog);

    const closeReuseBtn = document.getElementById('closeReuseModal');
    if (closeReuseBtn) closeReuseBtn.addEventListener('click', closeReuseDialog);

    const cancelReuseBtn = document.getElementById('cancelReuseBtn');
    if (cancelReuseBtn) cancelReuseBtn.addEventListener('click', closeReuseDialog);

    const confirmReuseBtn = document.getElementById('confirmReuseBtn');
    if (confirmReuseBtn) confirmReuseBtn.addEventListener('click', confirmReuse);

    const reuseModal = document.getElementById('reuseModal');
    if (reuseModal) {
      reuseModal.addEventListener('click', (e) => {
        if (e.target === reuseModal) closeReuseDialog();
      });
    }
  }

  if (isCompletedPage()) {
    log('init() - isCompletedPage = true');
    try {
      await renderCompleted();
      log('init() - renderCompleted OK');
    } catch (e) {
      logError('renderCompleted failed:', e);
    }

    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
      monthSelect.addEventListener('change', () => {
        selectedMonth = monthSelect.value;
        renderCompletedFromCache();
      });
    }

    const exportBtn = document.getElementById('exportMonthBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportMonth);

    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importFileInput');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', () => {
        if (importInput.files.length > 0) {
          importTasks(importInput.files[0]);
          importInput.value = '';
        }
      });
    }

    const clearBtn = document.getElementById('clearCompletedBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const completed = completedCache || await fetchCompleted();
        if (selectedMonth !== 'todos') {
          const label = getMonthLabel(selectedMonth);
          if (!confirm(`¿Eliminar solo las tareas de ${label}?`)) return;
          const updated = completed.filter((t) => t.month !== selectedMonth);
          await saveCompleted(updated);
        } else {
          if (!confirm('¿Eliminar todas las tareas completadas?')) return;
          await saveCompleted([]);
        }
        renderCompletedFromCache();
      });
    }
  }

  connectSSE();
  log('init() - complete, events bound');
}

document.addEventListener('DOMContentLoaded', init);
