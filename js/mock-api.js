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
  for (const s of slots) {
    const found = getSlotDef(s.id);
    if (found) s.availableKarts = getKarts(s.id, found.def);
  }
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
    if (candidate.id === slotId) {
      const found = getSlotDef(slotId);
      if (found) candidate.availableKarts = getKarts(slotId, found.def);
      return candidate;
    }
  }
  throw { status: 404, code: 'NOT_FOUND', message: 'Слот не найден.' };
}

const LS_KEY = 'kartingMockBookings';

const EQUIPMENT_PACKAGES = [
  { id: 'none', name: 'Своя экипировка', pricePerPerson: 0 },
  { id: 'helmet', name: 'Шлем', pricePerPerson: 200 },
  { id: 'helmet_balaclava', name: 'Шлем + Подшлемник', pricePerPerson: 300 },
  { id: 'full', name: 'Полный комплект', pricePerPerson: 600 }
];

function getSlotDef(slotId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const def of SLOT_DEFS) {
    const s = buildSlot(def, today);
    if (s.id === slotId) return { def, slot: s };
  }
  return null;
}

function getKarts(slotId, def) {
  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const bookedCount = stored
    .filter(b => b.slot.id === slotId && b.status === 'confirmed')
    .reduce((sum, b) => sum + b.participantsCount, 0);
  return Math.max(0, def.karts - bookedCount);
}

function generateBookingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `APEX-${r}`;
}

export async function mockCreateBooking(data) {
  if (simulateErrorFlag) {
    throw { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Сервис временно недоступен. Попробуйте позже.' };
  }
  await delay();

  const found = getSlotDef(data.slotId);
  if (!found) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Слот не найден.' };
  }
  const { def, slot } = found;

  if (!slot.bookingAllowed) {
    throw { status: 422, code: 'BOOKING_NOT_ALLOWED', message: 'Бронирование на этот слот запрещено.' };
  }
  if (slot.status === 'cancelled' || slot.status === 'closed') {
    throw { status: 422, code: 'SLOT_UNAVAILABLE', message: 'Слот недоступен для бронирования.' };
  }

  const pc = data.participantsCount;
  if (!Number.isInteger(pc) || pc < 1) {
    throw { status: 400, code: 'INVALID_PARTICIPANTS', message: 'Количество участников должно быть не менее 1.' };
  }

  const currentKarts = getKarts(data.slotId, def);
  if (pc > currentKarts) {
    throw { status: 409, code: 'NOT_ENOUGH_KARTS', message: `Недостаточно свободных картов. Доступно: ${currentKarts}.` };
  }
  if (pc > slot.maxParticipants) {
    throw { status: 400, code: 'EXCEEDS_MAX', message: `Максимум участников для этого слота: ${slot.maxParticipants}.` };
  }

  if (!data.customer?.name?.trim()) {
    throw { status: 400, code: 'MISSING_NAME', message: 'Укажите имя.' };
  }
  if (!data.customer?.phone?.trim()) {
    throw { status: 400, code: 'MISSING_PHONE', message: 'Укажите телефон.' };
  }

  const eqPkg = EQUIPMENT_PACKAGES.find(p => p.id === data.equipmentSelection);
  const rentalPrice = eqPkg ? eqPkg.pricePerPerson : 0;
  const totalPrice = slot.basePrice * pc + rentalPrice * pc;

  const now = new Date();
  const deadline = new Date(slot.startAt);
  deadline.setMinutes(deadline.getMinutes() - 15);

  const booking = {
    id: `bk-${Date.now()}`,
    bookingNumber: generateBookingNumber(),
    slot: {
      id: slot.id,
      startAt: slot.startAt,
      durationMinutes: slot.durationMinutes,
      trackConfiguration: { ...slot.trackConfiguration },
      marshal: { ...slot.marshal },
      centerAddress: slot.centerAddress,
      meetingPoint: slot.meetingPoint
    },
    participantsCount: pc,
    equipmentSelection: data.equipmentSelection,
    equipmentPricePerPerson: rentalPrice,
    customer: {
      name: data.customer.name.trim(),
      phone: data.customer.phone.trim()
    },
    totalPrice,
    status: 'confirmed',
    canCancel: true,
    cancellationDeadline: deadline.toISOString(),
    cancellationInfo: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  stored.push(booking);
  localStorage.setItem(LS_KEY, JSON.stringify(stored));

  return booking;
}

export function getEquipmentPackages() {
  return EQUIPMENT_PACKAGES.map(p => ({ ...p }));
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

let seeded = false;

function seedDemoBookings() {
  if (seeded) return;
  seeded = true;
  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  if (stored.some(b => b.status === 'cancelled_by_center')) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const def = SLOT_DEFS[0];
  const slot = buildSlot(def, today);

  const now = new Date();
  const deadline = new Date(slot.startAt);
  deadline.setMinutes(deadline.getMinutes() - 15);
  const pastHour = new Date(now.getTime() - 3600000);

  const demo = {
    id: 'bk-demo-cancelled-center',
    bookingNumber: 'APEX-DEMO01',
    slot: {
      id: slot.id,
      startAt: slot.startAt,
      durationMinutes: slot.durationMinutes,
      trackConfiguration: { ...slot.trackConfiguration },
      marshal: { ...slot.marshal },
      centerAddress: slot.centerAddress,
      meetingPoint: slot.meetingPoint
    },
    participantsCount: 2,
    equipmentSelection: 'full',
    equipmentPricePerPerson: 600,
    customer: { name: 'Демо', phone: '+7 999 111-22-33' },
    totalPrice: slot.basePrice * 2 + 600 * 2,
    status: 'cancelled_by_center',
    canCancel: false,
    cancellationDeadline: deadline.toISOString(),
    cancellationInfo: {
      reason: 'Слот отменён центром по техническим причинам. Приносим извинения.',
      cancelledAt: pastHour.toISOString(),
      cancelledBy: 'center'
    },
    createdAt: new Date(now.getTime() - 7200000).toISOString(),
    updatedAt: pastHour.toISOString()
  };

  stored.push(demo);
  localStorage.setItem(LS_KEY, JSON.stringify(stored));
}

export async function mockFetchBookings() {
  if (simulateErrorFlag) {
    throw { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Ошибка сервера. Попробуйте позже.' };
  }
  await delay();
  seedDemoBookings();
  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  return { bookings: stored.slice().reverse() };
}

export async function mockFetchBooking(bookingId) {
  if (simulateErrorFlag) {
    throw { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Ошибка сервера. Попробуйте позже.' };
  }
  await delay();
  seedDemoBookings();
  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const booking = stored.find(b => b.id === bookingId);
  if (!booking) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Бронирование не найдено.' };
  }
  return booking;
}

export async function mockCancelBooking(bookingId) {
  if (simulateErrorFlag) {
    throw { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Сервис временно недоступен. Попробуйте позже.' };
  }
  await delay();

  const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const idx = stored.findIndex(b => b.id === bookingId);
  if (idx === -1) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Бронирование не найдено.' };
  }

  const booking = stored[idx];
  if (booking.status !== 'confirmed') {
    throw { status: 422, code: 'CANCEL_NOT_ALLOWED', message: 'Это бронирование нельзя отменить.' };
  }
  if (!booking.canCancel) {
    throw { status: 422, code: 'CANCEL_NOT_ALLOWED', message: 'Отмена этого бронирования запрещена.' };
  }

  const now = new Date();
  const deadline = new Date(booking.cancellationDeadline);
  if (now > deadline) {
    throw { status: 422, code: 'DEADLINE_PASSED', message: 'Срок отмены бронирования истёк.' };
  }

  booking.status = 'cancelled_by_client';
  booking.canCancel = false;
  booking.cancellationInfo = {
    reason: 'Отменено клиентом',
    cancelledAt: now.toISOString(),
    cancelledBy: 'client'
  };
  booking.updatedAt = now.toISOString();

  stored[idx] = booking;
  localStorage.setItem(LS_KEY, JSON.stringify(stored));

  return booking;
}
