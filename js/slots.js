import { fetchSlots, fetchSlot } from './api.js';
import { openBookingForm } from './booking.js';
import {
  formatPrice, formatDate, formatTime, formatDuration,
  difficultyLabel, difficultyClass, statusLabel, statusClass,
  clearContainer, escapeHtml, toDateInputValue, getToday, getDatePlusDays
} from './utils.js';

const DEFAULT_DAYS = 7;
const $ = id => document.getElementById(id);

let currentSlots = [];
let currentDetailSlotId = null;

function getDefaultDateFrom() {
  return toDateInputValue(getToday());
}

function getDefaultDateTo() {
  return toDateInputValue(getDatePlusDays(DEFAULT_DAYS - 1));
}

function getFilters() {
  return {
    dateFrom: $('filter-date-from')?.value || getDefaultDateFrom(),
    dateTo: $('filter-date-to')?.value || getDefaultDateTo(),
    trackId: $('filter-track')?.value || 'all',
    difficulty: $('filter-difficulty')?.value || 'all'
  };
}

function hideAllStates() {
  ['slots-loading', 'slots-error', 'slots-empty', 'slots-list'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
}

function showElement(id) {
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

export async function loadSlots(dateFrom, dateTo) {
  hideAllStates();
  showElement('slots-loading');
  const listEl = $('slots-list');
  clearContainer(listEl);

  try {
    const result = await fetchSlots(dateFrom, dateTo);
    currentSlots = result.slots || [];
    hideAllStates();
    if (currentSlots.length === 0) {
      showElement('slots-empty');
    } else {
      showElement('slots-list');
      applyClientFilters();
    }
  } catch (err) {
    hideAllStates();
    showElement('slots-error');
    const msgEl = $('slots-error-msg');
    if (msgEl) msgEl.textContent = err.message || 'Произошла ошибка при загрузке расписания.';
  }
}

function applyClientFilters() {
  const filters = getFilters();
  let filtered = [...currentSlots];

  if (filters.trackId !== 'all') {
    filtered = filtered.filter(s => s.trackConfiguration.id === filters.trackId);
  }
  if (filters.difficulty !== 'all') {
    filtered = filtered.filter(s => s.trackConfiguration.difficulty === filters.difficulty);
  }

  const listEl = $('slots-list');
  clearContainer(listEl);

  if (filtered.length === 0) {
    showElement('slots-empty');
    return;
  }

  const grouped = groupByDate(filtered);
  for (const [dateKey, slots] of grouped) {
    const groupEl = document.createElement('div');
    groupEl.className = 'slot-group';

    const header = document.createElement('h3');
    header.className = 'slot-group__date';
    const d = new Date(slots[0].startAt);
    const today = getToday();
    const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    let label;
    if (diff === 0) label = 'Сегодня';
    else if (diff === 1) label = 'Завтра';
    else label = formatDate(slots[0].startAt);
    header.textContent = label;
    groupEl.appendChild(header);

    for (const slot of slots) {
      groupEl.appendChild(createSlotCard(slot));
    }
    listEl.appendChild(groupEl);
  }
}

function groupByDate(slots) {
  const map = new Map();
  for (const s of slots) {
    const key = s.startAt.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, arr] of sorted) {
    arr.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
  return sorted;
}

function createSlotCard(slot) {
  const card = document.createElement('div');
  card.className = 'slot-card';

  const isUnavailable = !slot.bookingAllowed || slot.status === 'cancelled' || slot.status === 'closed';
  if (isUnavailable) card.classList.add('slot-card--unavailable');

  const time = formatTime(slot.startAt);
  const price = slot.bookingAllowed ? formatPrice(slot.basePrice) : '—';
  const diffLabel = difficultyLabel(slot.trackConfiguration.difficulty);
  const diffClass = difficultyClass(slot.trackConfiguration.difficulty);

  card.innerHTML = `
    <div class="slot-card__header">
      <span class="slot-card__time">${escapeHtml(time)}</span>
      <span class="slot-card__duration">${formatDuration(slot.durationMinutes)}</span>
    </div>
    <div class="slot-card__body">
      <div class="slot-card__track">${escapeHtml(slot.trackConfiguration.name)}</div>
      <span class="badge ${diffClass}">${escapeHtml(diffLabel)}</span>
      <div class="slot-card__marshal">
        <span class="slot-card__label">Маршал:</span> ${escapeHtml(slot.marshal.name)}
      </div>
      <div class="slot-card__karts">
        <span class="slot-card__label">Карты:</span> ${slot.availableKarts}/${slot.maxParticipants}
      </div>
    </div>
    <div class="slot-card__footer">
      <span class="slot-card__price">${price}</span>
      <span class="slot-card__status ${statusClass(slot.status)}">${statusLabel(slot.status)}</span>
      <button class="btn btn--detail" data-slot-id="${escapeHtml(slot.id)}">Подробнее</button>
    </div>
  `;

  const detailBtn = card.querySelector('.btn--detail');
  detailBtn.addEventListener('click', () => showSlotDetail(slot.id));

  return card;
}

export async function showSlotDetail(slotId) {
  currentDetailSlotId = slotId;
  const container = $('slot-detail-content');
  clearContainer(container);
  container.innerHTML = '<div class="loading-spinner"></div>';
  showScreen('slot-detail');

  try {
    const slot = await fetchSlot(slotId);
    clearContainer(container);
    renderSlotDetail(slot, container);
  } catch (err) {
    clearContainer(container);
    container.innerHTML = `
      <div class="error-block">
        <p class="error-block__message">${escapeHtml(err.message || 'Не удалось загрузить информацию о слоте.')}</p>
        <button class="btn btn--primary" data-retry-detail>Повторить</button>
      </div>
    `;
    const retryBtn = container.querySelector('[data-retry-detail]');
    if (retryBtn) retryBtn.addEventListener('click', () => showSlotDetail(slotId));
  }
}

function renderSlotDetail(slot, container) {
  const isUnavailable = !slot.bookingAllowed || slot.status === 'cancelled' || slot.status === 'closed';
  const isFull = slot.availableKarts === 0;
  const canBook = slot.bookingAllowed && slot.status === 'available' && !isFull;
  const diffLabel = difficultyLabel(slot.trackConfiguration.difficulty);
  const diffClass = difficultyClass(slot.trackConfiguration.difficulty);

  container.innerHTML = `
    <div class="slot-detail">
      <div class="slot-detail__header">
        <h2 class="slot-detail__title">${escapeHtml(formatDate(slot.startAt))}</h2>
        <span class="slot-detail__time-big">${escapeHtml(formatTime(slot.startAt))}</span>
        <span class="slot-detail__duration">${formatDuration(slot.durationMinutes)}</span>
      </div>

      <div class="slot-detail__status ${statusClass(slot.status)}">
        ${statusLabel(slot.status)}
        ${!slot.bookingAllowed && slot.status === 'available' ? '· запись закрыта' : ''}
        ${isFull ? '· все карты заняты' : ''}
      </div>

      <div class="slot-detail__section">
        <h3>Трасса</h3>
        <p class="slot-detail__track-name">${escapeHtml(slot.trackConfiguration.name)}</p>
        <span class="badge ${diffClass}">${escapeHtml(diffLabel)}</span>
      </div>

      <div class="slot-detail__section">
        <h3>Маршал</h3>
        <p>${escapeHtml(slot.marshal.name)}</p>
      </div>

      <div class="slot-detail__section">
        <h3>Свободные карты</h3>
        <p class="slot-detail__karts">${slot.availableKarts} из ${slot.maxParticipants}</p>
      </div>

      <div class="slot-detail__section">
        <h3>Стоимость</h3>
        <p class="slot-detail__price">${slot.bookingAllowed ? formatPrice(slot.basePrice) : '—'}<span class="slot-detail__price-unit"> за участника</span></p>
      </div>

      <div class="slot-detail__section">
        <h3>Экипировка (прокат)</h3>
        <ul class="slot-detail__equipment">
          ${slot.equipmentOptions.map(eq => `
            <li>${escapeHtml(eq.name)} — ${formatPrice(eq.pricePerUnit)}</li>
          `).join('')}
        </ul>
      </div>

      <div class="slot-detail__section">
        <h3>Адрес</h3>
        <p>${escapeHtml(slot.centerAddress)}</p>
        <p class="slot-detail__meeting">Место сбора: ${escapeHtml(slot.meetingPoint)}</p>
      </div>

      ${canBook
        ? `<button class="btn btn--primary btn--full btn--book" id="btn-book-slot">Записаться</button>`
        : `<p class="slot-detail__unavailable">${isFull ? 'Все карты заняты' : 'Этот слот недоступен для бронирования'}</p>`}
    </div>
  `;

  if (canBook) {
    const bookBtn = container.querySelector('#btn-book-slot');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => openBookingForm(slot));
    }
  }
}

export function initSlots() {
  $('filter-date-from').addEventListener('change', onFilterChange);
  $('filter-date-to').addEventListener('change', onFilterChange);
  $('filter-track').addEventListener('change', onFilterChange);
  $('filter-difficulty').addEventListener('change', onFilterChange);
  $('filter-reset').addEventListener('click', resetFilters);
  $('slots-retry-btn').addEventListener('click', () => {
    const f = getFilters();
    loadSlots(f.dateFrom, f.dateTo);
  });
  $('btn-back-from-detail').addEventListener('click', () => {
    showScreen('slots');
  });
  $('btn-back-from-booking').addEventListener('click', () => {
    showScreen('slot-detail');
  });
}

function onFilterChange() {
  const f = getFilters();
  loadSlots(f.dateFrom, f.dateTo);
}

export function resetFilters() {
  $('filter-date-from').value = getDefaultDateFrom();
  $('filter-date-to').value = getDefaultDateTo();
  $('filter-track').value = 'all';
  $('filter-difficulty').value = 'all';
  const f = getFilters();
  loadSlots(f.dateFrom, f.dateTo);
}

function showScreen(screenId) {
  ['slots', 'slot-detail', 'booking-form', 'booking-confirmation'].forEach(id => {
    const el = $(`screen-${id}`);
    if (el) el.classList.toggle('screen--active', id === screenId);
  });
  const isOpen = screenId === 'slot-detail' || screenId === 'booking-form' || screenId === 'booking-confirmation';
  document.body.classList.toggle('body--detail-open', isOpen);
}

export { showScreen };
