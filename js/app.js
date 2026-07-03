import { initSlots, loadSlots, showScreen } from './slots.js';
import { initMyBookings, setActiveNav } from './my-bookings.js';
import { toDateInputValue, getToday, getDatePlusDays } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const dateFrom = toDateInputValue(getToday());
  const dateTo = toDateInputValue(getDatePlusDays(6));

  const filterFrom = document.getElementById('filter-date-from');
  const filterTo = document.getElementById('filter-date-to');
  if (filterFrom) filterFrom.value = dateFrom;
  if (filterTo) filterTo.value = dateTo;

  const navSlots = document.getElementById('nav-slots');
  if (navSlots) {
    navSlots.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen('slots');
      setActiveNav('slots');
    });
  }

  const navSlotsBtn = document.querySelector('[data-nav="slots"]');
  if (navSlotsBtn) {
    navSlotsBtn.addEventListener('click', () => {
      showScreen('slots');
      setActiveNav('slots');
    });
  }

  document.addEventListener('booking:created', () => {
    const df = document.getElementById('filter-date-from');
    const dt = document.getElementById('filter-date-to');
    if (df && dt) {
      loadSlots(df.value, dt.value);
    }
  });

  document.addEventListener('booking:cancelled', () => {
    const df = document.getElementById('filter-date-from');
    const dt = document.getElementById('filter-date-to');
    if (df && dt) {
      loadSlots(df.value, dt.value);
    }
  });

  initSlots();
  initMyBookings();
  await loadSlots(dateFrom, dateTo);
  setActiveNav('slots');
});
