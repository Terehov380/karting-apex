import { createBooking, fetchSlot } from './api.js';
import { getEquipmentPackages } from './mock-api.js';
import {
  formatPrice, formatDate, formatTime, formatDuration,
  escapeHtml, clearContainer
} from './utils.js';

const $ = id => document.getElementById(id);

let currentSlot = null;
let currentBookingResult = null;

const EQUIPMENT_PACKAGES = getEquipmentPackages();

export function openBookingForm(slot) {
  currentSlot = slot;
  const container = $('booking-form-content');
  clearContainer(container);

  renderBookingForm(slot, container);
  showBookingScreen('booking-form');

  $('booking-form-name').focus();
}

function renderBookingForm(slot, container) {
  const maxParticipants = Math.min(slot.availableKarts, slot.maxParticipants);

  container.innerHTML = `
    <div class="booking-form">
      <div class="booking-form__header">
        <h2 class="booking-form__title">Запись на заезд</h2>
        <div class="booking-form__slot-info">
          <p class="booking-form__date">${escapeHtml(formatDate(slot.startAt))}, <strong>${escapeHtml(formatTime(slot.startAt))}</strong></p>
          <p class="booking-form__meta">${escapeHtml(slot.trackConfiguration.name)} · ${escapeHtml(slot.marshal.name)} · ${formatDuration(slot.durationMinutes)}</p>
          <p class="booking-form__meta">Свободных картов: ${slot.availableKarts} · ${escapeHtml(slot.centerAddress)}</p>
          <p class="booking-form__meta">Место сбора: ${escapeHtml(slot.meetingPoint)}</p>
        </div>
      </div>

      <div class="booking-form__field">
        <label class="booking-form__label" for="booking-form-name">Имя *</label>
        <input type="text" class="booking-form__input" id="booking-form-name" placeholder="Введите имя" autocomplete="name">
        <p class="booking-form__error hidden" id="booking-name-error"></p>
      </div>

      <div class="booking-form__field">
        <label class="booking-form__label" for="booking-form-phone">Телефон *</label>
        <input type="tel" class="booking-form__input" id="booking-form-phone" placeholder="+7 999 123-45-67" autocomplete="tel">
        <p class="booking-form__error hidden" id="booking-phone-error"></p>
      </div>

      <div class="booking-form__field">
        <label class="booking-form__label" for="booking-form-participants">Количество участников</label>
        <input type="number" class="booking-form__input" id="booking-form-participants" value="1" min="1" max="${maxParticipants}" step="1">
        <p class="booking-form__hint">от 1 до ${maxParticipants}</p>
        <p class="booking-form__error hidden" id="booking-participants-error"></p>
      </div>

      <div class="booking-form__field">
        <label class="booking-form__label">Экипировка</label>
        <div class="booking-form__equipment" id="booking-form-equipment">
          ${EQUIPMENT_PACKAGES.map((pkg, i) => `
            <label class="booking-form__radio">
              <input type="radio" name="equipment" value="${escapeHtml(pkg.id)}" ${i === 0 ? 'checked' : ''}>
              <span class="booking-form__radio-label">
                <span>${escapeHtml(pkg.name)}</span>
                <span class="booking-form__radio-price">${pkg.pricePerPerson === 0 ? 'бесплатно' : formatPrice(pkg.pricePerPerson) + '/чел'}</span>
              </span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="booking-form__total" id="booking-form-total">
        <span class="booking-form__total-label">Итого:</span>
        <span class="booking-form__total-price">${formatPrice(slot.basePrice * 1)}</span>
      </div>

      <div class="booking-form__field booking-form__field--checkbox">
        <label class="booking-form__checkbox-label">
          <input type="checkbox" id="booking-form-consent">
          <span>Я согласен на обработку персональных данных *</span>
        </label>
        <p class="booking-form__error hidden" id="booking-consent-error"></p>
      </div>

      <div class="booking-form__actions">
        <button class="btn btn--outline" id="booking-form-cancel">Отмена</button>
        <button class="btn btn--primary" id="booking-form-submit">Забронировать</button>
      </div>

      <div id="booking-form-api-error" class="booking-form__api-error hidden"></div>
    </div>
  `;

  bindFormEvents(slot, maxParticipants);
}

function bindFormEvents(slot, maxParticipants) {
  const participantsInput = $('booking-form-participants');
  const eqRadios = document.querySelectorAll('input[name="equipment"]');
  const submitBtn = $('booking-form-submit');
  const cancelBtn = $('booking-form-cancel');
  const consentCheck = $('booking-form-consent');
  const apiErrorEl = $('booking-form-api-error');

  function updateTotal() {
    const pc = parseInt(participantsInput.value, 10) || 1;
    const selectedEq = document.querySelector('input[name="equipment"]:checked');
    const pkg = EQUIPMENT_PACKAGES.find(p => p.id === (selectedEq?.value || 'none'));
    const rentalPrice = pkg ? pkg.pricePerPerson : 0;
    const total = slot.basePrice * pc + rentalPrice * pc;
    $('booking-form-total').querySelector('.booking-form__total-price').textContent = formatPrice(total);
  }

  participantsInput.addEventListener('input', () => {
    validateParticipants(participantsInput, maxParticipants);
    updateTotal();
  });
  eqRadios.forEach(el => el.addEventListener('change', updateTotal));

  cancelBtn.addEventListener('click', () => {
    showBookingScreen('slot-detail');
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    apiErrorEl.classList.add('hidden');

    const name = $('booking-form-name').value.trim();
    const phone = $('booking-form-phone').value.trim();
    const pc = parseInt(participantsInput.value, 10);
    const selectedEq = document.querySelector('input[name="equipment"]:checked');
    const consent = consentCheck.checked;

    let valid = true;

    if (!name || name.length < 2) {
      showFieldError('booking-name-error', 'Введите имя (минимум 2 символа)');
      valid = false;
    } else {
      hideFieldError('booking-name-error');
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      showFieldError('booking-phone-error', 'Введите корректный номер телефона (минимум 10 цифр)');
      valid = false;
    } else {
      hideFieldError('booking-phone-error');
    }

    if (!validateParticipants(participantsInput, maxParticipants)) {
      valid = false;
    }

    if (!consent) {
      showFieldError('booking-consent-error', 'Необходимо согласие на обработку персональных данных');
      valid = false;
    } else {
      hideFieldError('booking-consent-error');
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Бронируем...';

    try {
      const result = await createBooking({
        slotId: slot.id,
        participantsCount: pc,
        equipmentSelection: selectedEq?.value || 'none',
        customer: { name, phone }
      });
      currentBookingResult = result;
      renderBookingConfirmation(result);
    } catch (err) {
      const status = err.status || 0;
      apiErrorEl.classList.remove('hidden');

      if (status === 409) {
        apiErrorEl.innerHTML = `
          <p>${escapeHtml(err.message || 'Мест уже недостаточно.')}</p>
          <button class="btn btn--outline" id="booking-refresh-slot">Обновить информацию</button>
        `;
        const refreshBtn = apiErrorEl.querySelector('#booking-refresh-slot');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', async () => {
            try {
              const updated = await fetchSlot(slot.id);
              currentSlot = updated;
              openBookingForm(updated);
            } catch {
              showBookingScreen('slot-detail');
            }
          });
        }
      } else if (status === 400 || status === 422) {
        apiErrorEl.innerHTML = `<p>${escapeHtml(err.message || 'Проверьте введённые данные.')}</p>`;
      } else if (status === 404) {
        apiErrorEl.innerHTML = `<p>${escapeHtml(err.message || 'Слот не найден.')}</p>
          <button class="btn btn--outline" data-back-slots>К расписанию</button>`;
        const backBtn = apiErrorEl.querySelector('[data-back-slots]');
        if (backBtn) backBtn.addEventListener('click', () => showBookingScreen('slots'));
      } else {
        apiErrorEl.innerHTML = `<p>${escapeHtml(err.message || 'Произошла ошибка. Попробуйте позже.')}</p>`;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Забронировать';
    }
  });
}

function validateParticipants(input, max) {
  const val = parseInt(input.value, 10);
  const errorEl = $('booking-participants-error');
  if (isNaN(val) || val < 1) {
    showFieldErrorEl(errorEl, 'Минимум 1 участник');
    return false;
  }
  if (val > max) {
    showFieldErrorEl(errorEl, `Максимум ${max} участников`);
    return false;
  }
  hideFieldErrorEl(errorEl);
  return true;
}

function showFieldError(id, msg) {
  const el = $(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideFieldError(id) {
  const el = $(id);
  if (el) el.classList.add('hidden');
}

function showFieldErrorEl(el, msg) {
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideFieldErrorEl(el) {
  if (el) el.classList.add('hidden');
}

function renderBookingConfirmation(booking) {
  const container = $('booking-confirmation-content');
  clearContainer(container);

  container.innerHTML = `
    <div class="booking-confirmation">
      <div class="booking-confirmation__icon">✓</div>
      <h2 class="booking-confirmation__title">Вы записаны!</h2>
      <p class="booking-confirmation__number">Номер бронирования</p>
      <p class="booking-confirmation__code">${escapeHtml(booking.bookingNumber)}</p>
      <p class="booking-confirmation__status">Статус: Подтверждено</p>

      <div class="booking-confirmation__details">
        <div class="booking-confirmation__detail">
          <span class="booking-confirmation__detail-label">Дата и время</span>
          <span class="booking-confirmation__detail-value">${escapeHtml(formatDate(booking.slot.startAt))}, ${escapeHtml(formatTime(booking.slot.startAt))}</span>
        </div>
        <div class="booking-confirmation__detail">
          <span class="booking-confirmation__detail-label">Трасса</span>
          <span class="booking-confirmation__detail-value">${escapeHtml(booking.slot.trackConfiguration.name)}</span>
        </div>
        <div class="booking-confirmation__detail">
          <span class="booking-confirmation__detail-label">Маршал</span>
          <span class="booking-confirmation__detail-value">${escapeHtml(booking.slot.marshal.name)}</span>
        </div>
        <div class="booking-confirmation__detail">
          <span class="booking-confirmation__detail-label">Участников</span>
          <span class="booking-confirmation__detail-value">${booking.participantsCount}</span>
        </div>
        <div class="booking-confirmation__detail">
          <span class="booking-confirmation__detail-label">Итого</span>
          <span class="booking-confirmation__detail-value booking-confirmation__detail-value--price">${formatPrice(booking.totalPrice)}</span>
        </div>
      </div>

      <button class="btn btn--primary btn--full" id="booking-confirmation-close">К расписанию</button>
    </div>
  `;

  $('booking-confirmation-close').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('booking:created'));
    showBookingScreen('slots');
  });

  showBookingScreen('booking-confirmation');
}

function showBookingScreen(screenId) {
  const validScreens = ['slots', 'slot-detail', 'booking-form', 'booking-confirmation'];
  for (const id of validScreens) {
    const el = $(`screen-${id}`);
    if (el) el.classList.toggle('screen--active', id === screenId);
  }
  const isOpen = screenId === 'slot-detail' || screenId === 'booking-form' || screenId === 'booking-confirmation';
  document.body.classList.toggle('body--detail-open', isOpen);
}

export { showBookingScreen };
