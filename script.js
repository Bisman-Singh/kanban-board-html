const STORAGE_KEY = 'kanban-tasks';

const state = {
  tasks: JSON.parse(localStorage.getItem(STORAGE_KEY)) || [],
  draggedId: null,
  deleteTargetId: null,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function getTasksByStatus(status) {
  return state.tasks.filter(t => t.status === status);
}

function updateCounts() {
  ['todo', 'in-progress', 'done'].forEach(status => {
    document.getElementById(`count-${status}`).textContent = getTasksByStatus(status).length;
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.id = task.id;

  card.innerHTML = `
    <span class="priority-badge ${task.priority}">${task.priority}</span>
    <div class="task-title" title="Double-click to edit">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
    <button class="delete-btn" aria-label="Delete task">&times;</button>
  `;

  const titleEl = card.querySelector('.task-title');
  titleEl.addEventListener('dblclick', () => {
    titleEl.contentEditable = 'true';
    titleEl.focus();
    selectAllText(titleEl);
  });

  titleEl.addEventListener('blur', () => {
    titleEl.contentEditable = 'false';
    const newTitle = titleEl.textContent.trim();
    if (newTitle && newTitle !== task.title) {
      task.title = newTitle;
      save();
    } else {
      titleEl.textContent = task.title;
    }
  });

  titleEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
    if (e.key === 'Escape') {
      titleEl.textContent = task.title;
      titleEl.contentEditable = 'false';
    }
  });

  card.querySelector('.delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    state.deleteTargetId = task.id;
    document.getElementById('confirm-overlay').classList.add('active');
  });

  card.addEventListener('dragstart', e => {
    state.draggedId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    state.draggedId = null;
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function selectAllText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function render() {
  ['todo', 'in-progress', 'done'].forEach(status => {
    const list = document.getElementById(`list-${status}`);
    list.innerHTML = '';
    getTasksByStatus(status).forEach(task => {
      list.appendChild(createTaskCard(task));
    });
  });
  updateCounts();
}

function setupDropZones() {
  document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', e => {
      if (!list.contains(e.relatedTarget)) {
        list.classList.remove('drag-over');
      }
    });

    list.addEventListener('drop', e => {
      e.preventDefault();
      list.classList.remove('drag-over');
      if (!state.draggedId) return;

      const newStatus = list.closest('.column').dataset.status;
      const task = state.tasks.find(t => t.id === state.draggedId);
      if (task && task.status !== newStatus) {
        task.status = newStatus;
        save();
        render();
      }
    });
  });
}

function setupModal() {
  const overlay = document.getElementById('modal-overlay');
  const form = document.getElementById('task-form');
  const titleInput = document.getElementById('task-title-input');

  document.getElementById('add-task-btn').addEventListener('click', () => {
    form.reset();
    document.getElementById('modal-title').textContent = 'New Task';
    overlay.classList.add('active');
    setTimeout(() => titleInput.focus(), 100);
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    state.tasks.push({
      id: generateId(),
      title,
      description: document.getElementById('task-desc-input').value.trim(),
      priority: document.getElementById('task-priority-input').value,
      status: 'todo',
    });

    save();
    render();
    overlay.classList.remove('active');
  });
}

function setupConfirmDialog() {
  const overlay = document.getElementById('confirm-overlay');

  document.getElementById('confirm-no').addEventListener('click', () => {
    state.deleteTargetId = null;
    overlay.classList.remove('active');
  });

  document.getElementById('confirm-yes').addEventListener('click', () => {
    state.tasks = state.tasks.filter(t => t.id !== state.deleteTargetId);
    state.deleteTargetId = null;
    save();
    render();
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      state.deleteTargetId = null;
      overlay.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  setupDropZones();
  setupModal();
  setupConfirmDialog();
});
