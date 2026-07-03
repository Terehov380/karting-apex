import { initSlots, loadSlots, showScreen } from './slots.js';
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
    });
  }

  document.addEventListener('booking:created', () => {
    const df = document.getElementById('filter-date-from');
    const dt = document.getElementById('filter-date-to');
    if (df && dt) {
      loadSlots(df.value, dt.value);
    }
  });

  initSlots();
  await loadSlots(dateFrom, dateTo);
});
