import { fetchBookings, cancelBooking } from './api.js';
import {
  formatPrice, formatDateTime,
  clearContainer, escapeHtml
} from './utils.js';
import { showScreen } from './slots.js';

const $ = id => document.getElementById(id);

const EQUIPMENT_NAMES = {
  'none': 'Своя экипировка',
  'helmet': 'Шлем',
  'helmet_balaclava': 'Шлем + Подшлемник',
  'full': 'Полный комплект'
};

const BOOKING_STATUS_LABELS = {
  'confirmed': 'Подтверждено',
  'cancelled_by_client': 'Отменено клиентом',
  'cancelled_by_center': 'Отменено центром',
  'completed': 'Завершено'
};

export function setActiveNav(navId) {
  document.querySelectorAll('.header__nav-item').forEach(el => {
    el.classList.toggle('header__nav-item--active', el.dataset.nav === navId);
  });
}

export async function openMyBookings() {
  showScreen('my-bookings');
  setActiveNav('my-bookings');
  await loadBookings();
}

async function loadBookings() {
  hideAllStates();
  showElement('bookings-loading');
  const listEl = $('bookings-list');
  clearContainer(listEl);

  try {
    const result = await fetchBookings();
    hideAllStates();
    if (!result.bookings || result.bookings.length === 0) {
      showElement('bookings-empty');
    } else {
      showElement('bookings-list');
      renderBookings(result.bookings, listEl);
    }
  } catch (err) {
    hideAllStates();
    showElement('bookings-error');
    const msgEl = $('bookings-error-msg');
    if (msgEl) msgEl.textContent = err.message || 'Произошла ошибка при загрузке бронирований.';
  }
}

function hideAllStates() {
  ['bookings-loading', 'bookings-error', 'bookings-empty', 'bookings-list'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
}

function showElement(id) {
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

function renderBookings(bookings, container) {
  for (const booking of bookings) {
    container.appendChild(createBookingCard(booking));
  }
}

function createBookingCard(booking) {
  const card = document.createElement('div');
  card.className = 'booking-card';
  card.dataset.bookingId = booking.id;

  const statusLabel = BOOKING_STATUS_LABELS[booking.status] || booking.status;
  const sClass = statusClass(booking.status);
  const eqName = EQUIPMENT_NAMES[booking.equipmentSelection] || booking.equipmentSelection;
  const canCancel = booking.status === 'confirmed' && booking.canCancel && isDeadlineValid(booking.cancellationDeadline);

  const rows = [
    { label: 'Дата и время', value: formatDateTime(booking.slot.startAt) },
    { label: 'Трасса', value: booking.slot.trackConfiguration.name },
    { label: 'Маршал', value: booking.slot.marshal.name },
    { label: 'Участников', value: String(booking.participantsCount) },
    { label: 'Экипировка', value: eqName }
  ];

  if (booking.cancellationDeadline && booking.status === 'confirmed') {
    rows.push({ label: 'Срок отмены', value: formatDateTime(booking.cancellationDeadline) });
  }

  rows.push({ label: 'Создано', value: formatDateTime(booking.createdAt) });

  card.innerHTML = `
    <div class="booking-card__header">
      <span class="booking-card__number">${escapeHtml(booking.bookingNumber)}</span>
      <span class="booking-card__status ${sClass}">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="booking-card__body">
      ${rows.map(r => `
        <div class="booking-card__row">
          <span class="booking-card__label">${escapeHtml(r.label)}</span>
          <span class="booking-card__value">${escapeHtml(r.value)}</span>
        </div>
      `).join('')}
    </div>
    <div class="booking-card__footer">
      <span class="booking-card__total">${formatPrice(booking.totalPrice)}</span>
      ${canCancel
        ? `<button class="btn btn--outline booking-card__cancel-btn" data-cancel-booking="${escapeHtml(booking.id)}">Отменить бронирование</button>`
        : ''}
    </div>
    ${booking.cancellationInfo
      ? `<div class="booking-card__cancellation">
          <p class="booking-card__cancellation-reason">${escapeHtml(booking.cancellationInfo.reason)}</p>
          ${booking.cancellationInfo.cancelledAt
            ? `<p class="booking-card__cancellation-date">${escapeHtml(formatDateTime(booking.cancellationInfo.cancelledAt))}</p>`
            : ''}
        </div>`
      : ''}
    <div class="cancel-confirm hidden" data-cancel-confirm="${escapeHtml(booking.id)}">
      <p class="cancel-confirm__text">Вы уверены, что хотите отменить бронирование?</p>
      <div class="cancel-confirm__actions">
        <button class="btn btn--outline" data-cancel-no="${escapeHtml(booking.id)}">Нет</button>
        <button class="btn btn--primary" data-cancel-yes="${escapeHtml(booking.id)}">Да, отменить</button>
      </div>
    </div>
  `;

  bindCancelEvents(card, booking);

  return card;
}

function bindCancelEvents(card, booking) {
  const cancelBtn = card.querySelector('[data-cancel-booking]');
  const confirmEl = card.querySelector('[data-cancel-confirm]');

  if (cancelBtn && confirmEl) {
    cancelBtn.addEventListener('click', () => {
      confirmEl.classList.remove('hidden');
      cancelBtn.classList.add('hidden');
    });

    const noBtn = confirmEl.querySelector('[data-cancel-no]');
    if (noBtn) {
      noBtn.addEventListener('click', () => {
        confirmEl.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
      });
    }

    const yesBtn = confirmEl.querySelector('[data-cancel-yes]');
    if (yesBtn) {
      yesBtn.addEventListener('click', async () => {
        confirmEl.innerHTML = '<div class="loading-spinner" style="margin: 8px auto"></div>';
        try {
          await cancelBooking(booking.id);
          document.dispatchEvent(new CustomEvent('booking:cancelled'));
          await loadBookings();
        } catch (err) {
          showCancelError(card, booking.id, err.message || 'Не удалось отменить бронирование.');
        }
      });
    }
  }
}

function showCancelError(card, bookingId, message) {
  const confirmEl = card.querySelector('[data-cancel-confirm]');
  if (!confirmEl) return;
  confirmEl.innerHTML = `
    <p class="booking-card__cancellation-reason" style="color:var(--color-red)">${escapeHtml(message)}</p>
    <button class="btn btn--outline" data-cancel-retry="${escapeHtml(bookingId)}">Повторить</button>
  `;
  const retryBtn = confirmEl.querySelector('[data-cancel-retry]');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      confirmEl.innerHTML = '<div class="loading-spinner" style="margin: 8px auto"></div>';
      try {
        await cancelBooking(bookingId);
        document.dispatchEvent(new CustomEvent('booking:cancelled'));
        await loadBookings();
      } catch (err2) {
        showCancelError(card, bookingId, err2.message || 'Не удалось отменить бронирование.');
      }
    });
  }
}

function statusClass(status) {
  const map = {
    'confirmed': 'booking-status--confirmed',
    'cancelled_by_client': 'booking-status--cancelled-client',
    'cancelled_by_center': 'booking-status--cancelled-center',
    'completed': 'booking-status--completed'
  };
  return map[status] || '';
}

function isDeadlineValid(deadlineIso) {
  if (!deadlineIso) return false;
  return new Date(deadlineIso) > new Date();
}

export function initMyBookings() {
  const navItem = document.querySelector('[data-nav="my-bookings"]');
  if (navItem) {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      openMyBookings();
    });
  }

  const retryBtn = $('bookings-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      loadBookings();
    });
  }
}
