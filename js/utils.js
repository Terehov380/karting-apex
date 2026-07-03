export function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  }).format(d);
}

export function formatTime(isoString) {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatDateTime(isoString) {
  return `${formatDate(isoString)}, ${formatTime(isoString)}`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDatePlusDays(n) {
  const d = getToday();
  d.setDate(d.getDate() + n);
  return d;
}

export function difficultyLabel(difficulty) {
  const map = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' };
  return map[difficulty] || difficulty;
}

export function difficultyClass(difficulty) {
  const map = { easy: 'badge--easy', medium: 'badge--medium', hard: 'badge--hard' };
  return map[difficulty] || '';
}

export function statusLabel(status) {
  const map = {
    available: 'Доступен',
    full: 'Заполнен',
    cancelled: 'Отменён',
    closed: 'Закрыт'
  };
  return map[status] || status;
}

export function statusClass(status) {
  const map = {
    available: 'status--available',
    full: 'status--full',
    cancelled: 'status--cancelled',
    closed: 'status--closed'
  };
  return map[status] || '';
}

export function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
