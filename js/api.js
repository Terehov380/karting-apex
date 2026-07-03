import { mockFetchSlots, mockFetchSlot, mockCreateBooking } from './mock-api.js';

let useMock = true;
const BASE_URL = 'https://api.karting-apex.ru/v1';

export function setUseMock(val) {
  useMock = val;
}

function buildError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.code = status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'API_ERROR';
  err.message = message;
  return err;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = null; }
    throw buildError(
      res.status,
      body?.message || `Ошибка ${res.status}`
    );
  }
  return res.json();
}

export async function fetchSlots(dateFrom, dateTo) {
  if (useMock) return mockFetchSlots(dateFrom, dateTo);
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return request(`/slots?${params.toString()}`);
}

export async function fetchSlot(slotId) {
  if (useMock) return mockFetchSlot(slotId);
  return request(`/slots/${encodeURIComponent(slotId)}`);
}

export async function createBooking(data) {
  if (useMock) return mockCreateBooking(data);
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
