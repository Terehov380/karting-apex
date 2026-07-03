const TRACKS = [
  { id: 'track-short', name: 'Короткая трасса', difficulty: 'easy' },
  { id: 'track-long', name: 'Длинная трасса', difficulty: 'medium' },
  { id: 'track-pro', name: 'Профессиональная трасса', difficulty: 'hard' }
];

const MARSHALS = [
  { id: 'mar-001', name: 'Алексей С.' },
  { id: 'mar-002', name: 'Мария К.' },
  { id: 'mar-003', name: 'Дмитрий В.' }
];

const EQUIPMENT = [
  { id: 'helmet', name: 'Шлем', pricePerUnit: 200 },
  { id: 'balaclava', name: 'Подшлемник', pricePerUnit: 100 },
  { id: 'overall', name: 'Комбинезон', pricePerUnit: 300 }
];

const SLOT_DEFS = [
  { dayOffset: 0, hour: 14, minute: 0, duration: 20, trackIdx: 0, marshalIdx: 0, karts: 8, maxP: 8, price: 1000, status: 'available', booking: true },
  { dayOffset: 1, hour: 10, minute: 0, duration: 25, trackIdx: 1, marshalIdx: 1, karts: 6, maxP: 6, price: 1500, status: 'available', booking: true },
  { dayOffset: 1, hour: 14, minute: 0, duration: 20, trackIdx: 0, marshalIdx: 0, karts: 0, maxP: 8, price: 1000, status: 'full', booking: false },
  { dayOffset: 2, hour: 12, minute: 0, duration: 30, trackIdx: 2, marshalIdx: 2, karts: 4, maxP: 4, price: 2000, status: 'available', booking: true },
  { dayOffset: 3, hour: 10, minute: 0, duration: 20, trackIdx: 0, marshalIdx: 1, karts: 8, maxP: 8, price: 1000, status: 'available', booking: true },
  { dayOffset: 3, hour: 16, minute: 0, duration: 25, trackIdx: 1, marshalIdx: 0, karts: 6, maxP: 6, price: 1500, status: 'available', booking: true },
  { dayOffset: 4, hour: 14, minute: 0, duration: 30, trackIdx: 2, marshalIdx: 2, karts: 4, maxP: 4, price: 2000, status: 'cancelled', booking: false },
  { dayOffset: 5, hour: 11, minute: 0, duration: 20, trackIdx: 0, marshalIdx: 0, karts: 8, maxP: 8, price: 1000, status: 'available', booking: true },
  { dayOffset: 5, hour: 15, minute: 0, duration: 25, trackIdx: 1, marshalIdx: 1, karts: 6, maxP: 6, price: 1500, status: 'available', booking: true },
  { dayOffset: 6, hour: 10, minute: 0, duration: 30, trackIdx: 2, marshalIdx: 2, karts: 4, maxP: 4, price: 2000, status: 'available', booking: true },
  { dayOffset: 6, hour: 12, minute: 0, duration: 20, trackIdx: 0, marshalIdx: 2, karts: 8, maxP: 8, price: 1000, status: 'available', booking: true }
];

let simulateErrorFlag = false;
let simulateDelay = true;

export function setSimulateError(val) {
  simulateErrorFlag = val;
}

export function setSimulateDelay(val) {
  simulateDelay = val;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function delay() {
  if (!simulateDelay) return Promise.resolve();
  const t = 200 + Math.random() * 400;
  return new Promise(r => setTimeout(r, t));
}

function buildSlot(def, baseDate) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() + def.dayOffset);
  start.setHours(def.hour, def.minute, 0, 0);
  const startAt = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}T${pad2(start.getHours())}:${pad2(start.getMinutes())}:00`;
  const track = TRACKS[def.trackIdx];
  const marshal = MARSHALS[def.marshalIdx];
  return {
    id: `slot-${String(def.dayOffset + 1).padStart(2, '0')}-${String(def.hour).padStart(2, '0')}${String(def.minute).padStart(2, '0')}`,
    startAt,
    durationMinutes: def.duration,
    status: def.status,
    trackConfiguration: {
      id: track.id,
      name: track.name,
      difficulty: track.difficulty
    },
    marshal: {
      id: marshal.id,
      name: marshal.name
    },
    availableKarts: def.karts,
    maxParticipants: def.maxP,
    basePrice: def.price,
    equipmentOptions: EQUIPMENT.map(e => ({ ...e })),
    centerAddress: 'ул. Картинговая, 1, окраина города',
    meetingPoint: 'Зона регистрации у входа',
    bookingAllowed: def.booking
  };
}

export async function mockFetchSlots(dateFrom, dateTo) {
  if (simulateErrorFlag) {
    throw { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Ошибка сервера. Попробуйте позже.' };
  }
  await delay();
  const from = new Date(dateFrom);
  from.setHours(0, 0, 0, 0);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
  const baseDate = new Date(today);
  const slots = SLOT_DEFS
    .filter(def => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + def.dayOffset);
      d.setHours(0, 0, 0, 0);
      return d >= from && d <= to;
    })
    .map(def => buildSlot(def, today));
  return { slots };
}

export async function mockFetchSlot(slotId) {
  if (simulateErrorFlag) {
    throw { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Ошибка сервера. Попробуйте позже.' };
  }
  await delay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const def of SLOT_DEFS) {
    const candidate = buildSlot(def, today);
    if (candidate.id === slotId) return candidate;
  }
  throw { status: 404, code: 'NOT_FOUND', message: 'Слот не найден.' };
}

export function getAvailableFilters() {
  return {
    tracks: TRACKS.map(t => ({ id: t.id, name: t.name })),
    difficulties: [
      { id: 'easy', name: 'Лёгкая' },
      { id: 'medium', name: 'Средняя' },
      { id: 'hard', name: 'Сложная' }
    ]
  };
}
