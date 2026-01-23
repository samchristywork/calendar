function toggleInstructions() {
  const instructions = document.querySelector('.instructions');
  instructions.classList.toggle('instructions-hidden');
}

const THEMES = [null, 'dark', 'light'];
const THEME_LABELS = { null: 'Auto (system)', dark: 'Dark', light: 'Light' };
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  if (next) {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  }
  showToast('Theme: ' + THEME_LABELS[next]);
}
(function applyTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

const calendar = document.getElementById('calendar');
let nWeeks = Math.min(52, Math.max(1, parseInt(localStorage.getItem('nWeeks'), 10) || 8));
let weekStart = parseInt(localStorage.getItem('weekStart'), 10) === 1 ? 1 : 0;
let events = {};
fetch('events.json')
  .then(response => response.json())
  .then(data => {
    events = data;
    generateCalendar();
  })
  .catch(error => {
    console.error('Error loading events:', error);
    generateCalendar();
  });

function hash(month) {
  return (month * 123123123) % 360;
}

function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function buildEffectiveEvents(visibleStart, visibleEnd) {
  const effective = {};
  for (const [date, dayEvents] of Object.entries(events)) {
    effective[date] = [];
    for (let idx = 0; idx < dayEvents.length; idx++) {
      const e = dayEvents[idx];
      const exc = e.exceptions && Object.prototype.hasOwnProperty.call(e.exceptions, date) ? e.exceptions[date] : undefined;
      if (exc === null) continue;
      effective[date].push(exc ? { ...exc, _baseDate: date, _baseIndex: idx } : { ...e, _baseDate: date, _baseIndex: idx });
    }
  }
  for (const [date, dayEvents] of Object.entries(events)) {
    const [y, m, d] = date.split('-').map(Number);
    for (let idx = 0; idx < dayEvents.length; idx++) {
      const event = dayEvents[idx];
      const recur = eventRecurrence(event);
      if (!recur) continue;
      let current = new Date(y, m - 1, d);
      let count = 1;
      const until = recur.until
        ? new Date(+recur.until.slice(0, 4), +recur.until.slice(4, 6) - 1, +recur.until.slice(6, 8))
        : null;
      while (true) {
        switch (recur.freq) {
          case 'DAILY':   current.setDate(current.getDate() + 1); break;
          case 'WEEKLY':  current.setDate(current.getDate() + 7); break;
          case 'MONTHLY': current.setMonth(current.getMonth() + 1); break;
          case 'YEARLY':  current.setFullYear(current.getFullYear() + 1); break;
        }
        count++;
        if (recur.count && count > recur.count) break;
        if (until && current > until) break;
        if (current > visibleEnd) break;
        if (current >= visibleStart) {
          const dateStr = toDateStr(current);
          const exc = event.exceptions && Object.prototype.hasOwnProperty.call(event.exceptions, dateStr) ? event.exceptions[dateStr] : undefined;
          if (exc === null) continue;
          if (!effective[dateStr]) effective[dateStr] = [];
          effective[dateStr].push(exc
            ? { ...exc, _baseDate: date, _baseIndex: idx }
            : { ...event, _baseDate: date, _baseIndex: idx });
        }
      }
    }
  }
  // Expand multi-day events
  for (const [date, dayEvents] of Object.entries(events)) {
    const [y, m, d] = date.split('-').map(Number);
    for (let idx = 0; idx < dayEvents.length; idx++) {
      const event = dayEvents[idx];
      const endDate = eventEndDate(event);
      if (!endDate) continue;
      let current = new Date(y, m - 1, d);
      const end = new Date(endDate + 'T00:00:00');
      while (true) {
        current.setDate(current.getDate() + 1);
        if (current > end) break;
        if (current > visibleEnd) break;
        if (current >= visibleStart) {
          const dateStr = toDateStr(current);
          if (!effective[dateStr]) effective[dateStr] = [];
          effective[dateStr].push({ ...event, _baseDate: date, _baseIndex: idx });
        }
      }
    }
  }
  return effective;
}

function generateWeek(currentDay, effectiveEvents) {
  const weekElement = document.createElement('div');
  weekElement.classList.add('row');
  weekElement.style.height = 'calc((100vh - 2rem) / ' + nWeeks + ')';

  for (let i = 0; i < 7; i++) {
    const dateText = toDateStr(currentDay);
    const isToday = (currentDay.toDateString() === new Date().toDateString());
    const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
    const dayElement = createDayElement(dateText, hash(currentDay.getMonth()), isToday, isWeekend, effectiveEvents[dateText] || []);
    currentDay.setDate(currentDay.getDate() + 1);
    weekElement.appendChild(dayElement);
  }

  return weekElement;
}

let currentDate = new Date();
let viewMode = 'calendar';

(function applyHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const [datePart, modePart] = hash.split(',');
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (datePart && dateRe.test(datePart)) {
    const d = new Date(datePart + 'T00:00:00');
    if (!isNaN(d.getTime())) currentDate = d;
  }
  if (modePart === 'agenda' || modePart === 'day') viewMode = modePart;
})();

function updateHash() {
  const parts = [toDateStr(currentDate)];
  if (viewMode !== 'calendar') parts.push(viewMode);
  history.replaceState(null, '', '#' + parts.join(','));
}

async function editEvent(date, index, occurrenceDate) {
  const base = events[date][index];
  const isInstance = occurrenceDate && occurrenceDate !== date && eventRecurrence(base);

  let scope = 'all';
  if (isInstance) {
    scope = await showScopeDialog(occurrenceDate);
    if (!scope) return;
  }

  const src = (scope === 'one' && base.exceptions && base.exceptions[occurrenceDate])
    ? base.exceptions[occurrenceDate] : base;

  const result = await showEventForm(
    isInstance ? 'Edit - ' + occurrenceDate : 'Edit event',
    { text: eventText(src), time: eventTime(src), endTime: eventEndTime(src),
      endDate: eventEndDate(src), category: eventCategory(src), notes: eventNotes(src),
      recurrence: scope !== 'one' ? eventRecurrence(src) : null },
    scope !== 'one',
    true
  );
  if (!result) return;

  if (result._deleted) {
    if (scope === 'one') {
      if (!events[date][index].exceptions) events[date][index].exceptions = {};
      events[date][index].exceptions[occurrenceDate] = null;
    } else if (scope === 'future') {
      const dayBefore = new Date(occurrenceDate + 'T00:00:00');
      dayBefore.setDate(dayBefore.getDate() - 1);
      const untilStr = toDateStr(dayBefore).replace(/-/g, '');
      if (base.recurrence) events[date][index].recurrence = { freq: base.recurrence.freq, until: untilStr };
    } else {
      events[date].splice(index, 1);
      if (events[date].length === 0) delete events[date];
    }
    saveEvents(); generateCalendar(); return;
  }

  const updatedEvent = { text: result.text, time: result.time, endTime: result.endTime, category: result.category, notes: result.notes };
  if (result.endDate) updatedEvent.endDate = result.endDate;

  if (scope === 'all') {
    if (result.recurrence) updatedEvent.recurrence = result.recurrence;
    if (base.exceptions) updatedEvent.exceptions = base.exceptions;
    if (base.done) updatedEvent.done = true;
    events[date][index] = updatedEvent;
    events[date].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
  } else if (scope === 'one') {
    if (!events[date][index].exceptions) events[date][index].exceptions = {};
    events[date][index].exceptions[occurrenceDate] = updatedEvent;
  } else if (scope === 'future') {
    const dayBefore = new Date(occurrenceDate + 'T00:00:00');
    dayBefore.setDate(dayBefore.getDate() - 1);
    const untilStr = toDateStr(dayBefore).replace(/-/g, '');
    if (base.recurrence) events[date][index].recurrence = { freq: base.recurrence.freq, until: untilStr };
    if (result.recurrence) updatedEvent.recurrence = result.recurrence;
    if (!events[occurrenceDate]) events[occurrenceDate] = [];
    events[occurrenceDate].push(updatedEvent);
    events[occurrenceDate].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
  }

  saveEvents(); generateCalendar();
}

function generateAgenda() {
  calendar.innerHTML = '';
  const visibleEnd = new Date(new Date().getFullYear() + 10, 11, 31);
  const effectiveEvents = buildEffectiveEvents(new Date(2000, 0, 1), visibleEnd);
  const allEntries = [];
  for (const [date, dayEvents] of Object.entries(effectiveEvents)) {
    for (const event of dayEvents) {
      allEntries.push({ date, baseDate: event._baseDate, baseIndex: event._baseIndex, event });
    }
  }
  allEntries.sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : normalizeTime(eventTime(a.event)).localeCompare(normalizeTime(eventTime(b.event)));
  });
  const query = getSearchQuery();
  const visible = query
    ? allEntries.filter(({ event: e }) =>
        eventText(e).toLowerCase().includes(query) ||
        eventCategory(e).toLowerCase().includes(query) ||
        eventNotes(e).toLowerCase().includes(query))
    : allEntries;
  const todayStr = toDateStr(new Date());
  let lastDate = '';
  for (const { date, baseDate, baseIndex, event } of visible) {
    const isOriginal = baseDate === date;
    if (date !== lastDate) {
      lastDate = date;
      const dh = document.createElement('div');
      dh.classList.add('agenda-date');
      if (date === todayStr) dh.classList.add('agenda-today');
      const d = new Date(date + 'T00:00:00');
      dh.textContent = d.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      calendar.appendChild(dh);
    }
    const row = document.createElement('div');
    row.classList.add('agenda-row');
    const t = eventTime(event);
    const et = eventEndTime(event);
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('agenda-time');
    timeSpan.textContent = t ? (et ? t + '–' + et : t) : 'All day';
    const titleSpan = document.createElement('span');
    titleSpan.classList.add('agenda-title');
    if (eventDone(event)) titleSpan.classList.add('agenda-done');
    titleSpan.textContent = eventText(event) + (eventRecurrence(event) ? ' ↻' : '') + (eventEndDate(event) ? ' ↦' : '');
    titleSpan.title = eventText(event) + (eventNotes(event) ? '\n' + eventNotes(event) : '');
    const catHue = categoryHue(eventCategory(event));
    if (catHue !== null) {
      titleSpan.classList.add('agenda-cat');
      titleSpan.style.setProperty('--cat-hue', catHue);
    }
    titleSpan.addEventListener('click', () => editEvent(baseDate, baseIndex, date));
    const checkBtn = document.createElement('span');
    checkBtn.classList.add('event-check');
    checkBtn.textContent = eventDone(event) ? '✓' : '○';
    if (isOriginal) {
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        events[baseDate][baseIndex].done = !events[baseDate][baseIndex].done;
        saveEvents();
        generateCalendar();
      });
    }
    const deleteBtn = document.createElement('span');
    deleteBtn.classList.add('event-delete', 'agenda-delete');
    deleteBtn.textContent = '×';
    if (isOriginal) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!await showConfirm('Delete "' + eventText(event) + '"?', 'Delete')) return;
        events[baseDate].splice(baseIndex, 1);
        if (events[baseDate].length === 0) delete events[baseDate];
        saveEvents();
        generateCalendar();
      });
    }
    row.appendChild(timeSpan);
    row.appendChild(titleSpan);
    row.appendChild(checkBtn);
    row.appendChild(deleteBtn);
    calendar.appendChild(row);
  }
  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.classList.add('agenda-empty');
    empty.textContent = query ? 'No matching events.' : 'No events.';
    calendar.appendChild(empty);
  }
  const sideLabel = document.getElementById('side-label');
  sideLabel.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = 'Agenda';
  sideLabel.appendChild(span);
}

function createDayViewEvent(event, dateStr) {
  const el = document.createElement('div');
  el.classList.add('event');
  el.addEventListener('click', (e) => e.stopPropagation());
  if (eventDone(event)) el.classList.add('event-done');
  const isOriginal = event._baseDate === dateStr;
  if (!isOriginal) el.classList.add('event-recurrence');
  const catHue = categoryHue(eventCategory(event));
  if (catHue !== null) { el.classList.add('event-cat'); el.style.setProperty('--cat-hue', catHue); }
  const baseDate = event._baseDate;
  const baseIndex = event._baseIndex;

  const label = document.createElement('span');
  const t = eventTime(event), et = eventEndTime(event);
  const timePrefix = t ? (et ? t + '-' + et : t) + ' ' : '';
  label.textContent = timePrefix + eventText(event) + (eventRecurrence(event) ? ' ↻' : '') + (eventEndDate(event) ? ' ↦' : '');
  label.title = label.textContent + (eventNotes(event) ? '\n' + eventNotes(event) : '');
  label.addEventListener('click', (e) => { e.stopPropagation(); editEvent(baseDate, baseIndex, dateStr); });

  const checkBtn = document.createElement('span');
  checkBtn.classList.add('event-check');
  checkBtn.textContent = eventDone(event) ? '✓' : '○';
  if (isOriginal) {
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      events[baseDate][baseIndex].done = !events[baseDate][baseIndex].done;
      saveEvents(); generateCalendar();
    });
  }

  const deleteBtn = document.createElement('span');
  deleteBtn.classList.add('event-delete');
  deleteBtn.textContent = '×';
  if (isOriginal) {
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!await showConfirm('Delete "' + eventText(event) + '"?', 'Delete')) return;
      events[baseDate].splice(baseIndex, 1);
      if (events[baseDate].length === 0) delete events[baseDate];
      saveEvents(); generateCalendar();
    });
  }

  el.appendChild(label); el.appendChild(checkBtn); el.appendChild(deleteBtn);
  return el;
}

function generateDayView() {
  calendar.innerHTML = '';
  const dateStr = toDateStr(currentDate);
  const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const effectiveEvents = buildEffectiveEvents(startOfDay, endOfDay);
  const dayEvents = effectiveEvents[dateStr] || [];
  const isToday = dateStr === toDateStr(new Date());
  const currentHour = new Date().getHours();

  const grid = document.createElement('div');
  grid.classList.add('day-view');

  const allDayEvents = dayEvents.filter(e => !eventTime(e));
  if (allDayEvents.length > 0) {
    const row = document.createElement('div');
    row.classList.add('day-view-row', 'day-view-allday-row');
    row.addEventListener('click', () => addEventForDate(dateStr));
    const label = document.createElement('div');
    label.classList.add('day-view-time-label');
    label.textContent = 'All day';
    const cell = document.createElement('div');
    cell.classList.add('day-view-events-cell');
    allDayEvents.forEach(ev => cell.appendChild(createDayViewEvent(ev, dateStr)));
    row.appendChild(label); row.appendChild(cell);
    grid.appendChild(row);
  }

  for (let h = 0; h < 24; h++) {
    const row = document.createElement('div');
    row.classList.add('day-view-row');
    if (isToday && h === currentHour) row.classList.add('day-view-current-hour');
    row.addEventListener('click', () => addEventForDate(dateStr));

    const label = document.createElement('div');
    label.classList.add('day-view-time-label');
    label.textContent = String(h).padStart(2, '0') + ':00';

    const cell = document.createElement('div');
    cell.classList.add('day-view-events-cell');
    dayEvents.filter(e => {
      const t = eventTime(e);
      return t && parseInt(t.split(':')[0], 10) === h;
    }).forEach(ev => cell.appendChild(createDayViewEvent(ev, dateStr)));

    row.appendChild(label); row.appendChild(cell);
    grid.appendChild(row);
  }

  calendar.appendChild(grid);

  const sideLabel = document.getElementById('side-label');
  sideLabel.innerHTML = '';
  const span = document.createElement('span');
  const d = new Date(dateStr + 'T00:00:00');
  span.textContent = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  sideLabel.appendChild(span);
}

function generateCalendar() {
  updateHash();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const header = document.getElementById('header');
  header.innerHTML = '';
  if (viewMode === 'day') {
    header.classList.add('header-day');
    const div = document.createElement('div');
    const d = new Date(toDateStr(currentDate) + 'T00:00:00');
    div.textContent = d.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    header.appendChild(div);
    generateDayView();
    return;
  }
  header.classList.remove('header-day');
  for (let i = 0; i < 7; i++) {
    const div = document.createElement('div');
    div.textContent = dayNames[(weekStart + i) % 7];
    header.appendChild(div);
  }
  if (viewMode === 'agenda') { generateAgenda(); return; }
  const daysBack = weekStart === 1 ? (currentDate.getDay() + 6) % 7 : currentDate.getDay();
  let weekStartDay = new Date(currentDate);
  weekStartDay.setDate(currentDate.getDate() - daysBack);
  const visibleStart = new Date(weekStartDay);
  const visibleEnd = new Date(weekStartDay);
  visibleEnd.setDate(visibleEnd.getDate() + nWeeks * 7 - 1);
  const effectiveEvents = buildEffectiveEvents(visibleStart, visibleEnd);
  let currentDay = new Date(weekStartDay);
  calendar.innerHTML = '';

  for (let i = 0; i < nWeeks; i++) {
    calendar.appendChild(generateWeek(currentDay, effectiveEvents));
  }

  const sideLabel = document.getElementById('side-label');
  sideLabel.innerHTML = '';
  const seen = new Set();
  for (let i = 0; i < nWeeks * 7; i++) {
    const d = new Date(weekStartDay);
    d.setDate(weekStartDay.getDate() + i);
    const key = d.getFullYear() + '-' + d.getMonth();
    if (!seen.has(key)) {
      seen.add(key);
      const span = document.createElement('span');
      span.textContent = d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();
      sideLabel.appendChild(span);
    }
  }
}

function eventText(e) { return typeof e === 'string' ? e : e.text; }
function eventTime(e) { return typeof e === 'string' ? '' : (e.time || ''); }
function eventEndTime(e) { return typeof e === 'string' ? '' : (e.endTime || ''); }
function eventEndDate(e) { return typeof e === 'string' ? '' : (e.endDate || ''); }
function eventCategory(e) { return typeof e === 'string' ? '' : (e.category || ''); }
function eventNotes(e) { return typeof e === 'string' ? '' : (e.notes || ''); }
function eventRecurrence(e) { return typeof e === 'string' ? null : (e.recurrence || null); }
function eventDone(e) { return typeof e === 'string' ? false : (e.done || false); }
function getSearchQuery() {
  const el = document.getElementById('search');
  return el ? el.value.trim().toLowerCase() : '';
}

function normalizeTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return h.padStart(2, '0') + ':' + (m || '00');
}

function showModal(buildFn) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');

    function close(value) {
      overlay.classList.add('modal-hidden');
      overlay.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onEscape, true);
      resolve(value);
    }

    function onBackdrop(e) { if (e.target === overlay) close(null); }
    function onEscape(e) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close(null); }
    }

    overlay.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onEscape, true);

    modal.innerHTML = '';
    modal.appendChild(buildFn(close));
    overlay.classList.remove('modal-hidden');
    setTimeout(() => {
      const f = modal.querySelector('input:not([type=hidden]),textarea,select');
      if (f) f.focus();
    }, 0);
  });
}

function makeFormGroup(labelText) {
  const g = document.createElement('div');
  g.className = 'modal-form-group';
  const l = document.createElement('label');
  l.textContent = labelText;
  g.appendChild(l);
  return g;
}

function showConfirm(message, confirmLabel = 'OK') {
  return showModal((close) => {
    const el = document.createElement('div');
    const p = document.createElement('p');
    p.className = 'modal-confirm-msg';
    p.textContent = message;
    el.appendChild(p);
    const btns = document.createElement('div');
    btns.className = 'modal-buttons';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => close(false);
    const okBtn = document.createElement('button');
    okBtn.className = 'modal-btn modal-btn-danger';
    okBtn.textContent = confirmLabel;
    okBtn.onclick = () => close(true);
    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    el.appendChild(btns);
    return el;
  });
}

function showScopeDialog(occurrenceDate) {
  return showModal((close) => {
    const el = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.className = 'modal-title';
    h2.textContent = 'Edit recurring event';
    el.appendChild(h2);
    const sub = document.createElement('p');
    sub.className = 'modal-confirm-msg';
    sub.textContent = 'Which occurrences should be changed?';
    el.appendChild(sub);
    const scopeBtns = document.createElement('div');
    scopeBtns.className = 'modal-scope-buttons';
    [['one', 'Just this occurrence', occurrenceDate],
     ['future', 'This and future occurrences', ''],
     ['all', 'All occurrences', '']].forEach(([scope, label, note]) => {
      const btn = document.createElement('button');
      btn.className = 'modal-scope-btn';
      const strong = document.createElement('strong');
      strong.textContent = label;
      btn.appendChild(strong);
      if (note) {
        const small = document.createElement('div');
        small.style.cssText = 'font-size:0.8em;opacity:0.65;margin-top:0.1rem';
        small.textContent = note;
        btn.appendChild(small);
      }
      btn.onclick = () => close(scope);
      scopeBtns.appendChild(btn);
    });
    el.appendChild(scopeBtns);
    const cancelRow = document.createElement('div');
    cancelRow.className = 'modal-buttons';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => close(null);
    cancelRow.appendChild(cancelBtn);
    el.appendChild(cancelRow);
    return el;
  });
}

function showDateDialog(defaultDate) {
  return showModal((close) => {
    const el = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.className = 'modal-title';
    h2.textContent = 'Go to date';
    el.appendChild(h2);
    const group = makeFormGroup('Date');
    const input = document.createElement('input');
    input.type = 'date';
    input.value = defaultDate;
    group.appendChild(input);
    el.appendChild(group);
    const btns = document.createElement('div');
    btns.className = 'modal-buttons';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => close(null);
    const goBtn = document.createElement('button');
    goBtn.className = 'modal-btn modal-btn-primary';
    goBtn.textContent = 'Go';
    goBtn.onclick = () => { if (input.value) close(input.value); };
    btns.appendChild(cancelBtn);
    btns.appendChild(goBtn);
    el.appendChild(btns);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goBtn.click(); } });
    return el;
  });
}

function showEventForm(title, data, showRecurrence, showDelete) {
  return showModal((close) => {
    const form = document.createElement('div');

    const h2 = document.createElement('h2');
    h2.className = 'modal-title';
    h2.textContent = title;
    form.appendChild(h2);

    const textGroup = makeFormGroup('Event *');
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = data.text || '';
    textGroup.appendChild(textInput);
    form.appendChild(textGroup);

    const endDateGroup = makeFormGroup('End date (multi-day)');
    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.value = data.endDate || '';
    endDateGroup.appendChild(endDateInput);
    form.appendChild(endDateGroup);

    const timeGroup = makeFormGroup('Time');
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = data.time || '';
    timeGroup.appendChild(timeInput);
    form.appendChild(timeGroup);

    const endTimeGroup = makeFormGroup('End time');
    const endTimeInput = document.createElement('input');
    endTimeInput.type = 'time';
    endTimeInput.value = data.endTime || '';
    endTimeGroup.appendChild(endTimeInput);
    form.appendChild(endTimeGroup);

    const catGroup = makeFormGroup('Category');
    const catInput = document.createElement('input');
    catInput.type = 'text';
    catInput.value = data.category || '';
    catGroup.appendChild(catInput);
    form.appendChild(catGroup);

    const notesGroup = makeFormGroup('Notes');
    const notesInput = document.createElement('textarea');
    notesInput.value = data.notes || '';
    notesGroup.appendChild(notesInput);
    form.appendChild(notesGroup);

    let freqSelect, recurEndGroup, recurEndTypeSelect, countInput, untilInput;
    if (showRecurrence) {
      const recurGroup = makeFormGroup('Repeat');
      freqSelect = document.createElement('select');
      [['', 'None'], ['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly'], ['YEARLY', 'Yearly']].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if ((data.recurrence ? data.recurrence.freq : '') === val) opt.selected = true;
        freqSelect.appendChild(opt);
      });
      recurGroup.appendChild(freqSelect);
      form.appendChild(recurGroup);

      recurEndGroup = makeFormGroup('Ends');
      recurEndGroup.style.display = data.recurrence ? '' : 'none';
      recurEndTypeSelect = document.createElement('select');
      [['never', 'Never'], ['count', 'After N occurrences'], ['until', 'By date']].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        recurEndTypeSelect.appendChild(opt);
      });
      if (data.recurrence && data.recurrence.count) recurEndTypeSelect.value = 'count';
      else if (data.recurrence && data.recurrence.until) recurEndTypeSelect.value = 'until';
      recurEndGroup.appendChild(recurEndTypeSelect);

      countInput = document.createElement('input');
      countInput.type = 'number'; countInput.min = 1;
      countInput.value = (data.recurrence && data.recurrence.count) || 10;
      countInput.style.display = (data.recurrence && data.recurrence.count) ? '' : 'none';
      recurEndGroup.appendChild(countInput);

      untilInput = document.createElement('input');
      untilInput.type = 'date';
      if (data.recurrence && data.recurrence.until) {
        const u = data.recurrence.until;
        untilInput.value = u.slice(0, 4) + '-' + u.slice(4, 6) + '-' + u.slice(6, 8);
      }
      untilInput.style.display = (data.recurrence && data.recurrence.until) ? '' : 'none';
      recurEndGroup.appendChild(untilInput);
      form.appendChild(recurEndGroup);

      freqSelect.addEventListener('change', () => {
        recurEndGroup.style.display = freqSelect.value ? '' : 'none';
      });
      recurEndTypeSelect.addEventListener('change', () => {
        countInput.style.display = recurEndTypeSelect.value === 'count' ? '' : 'none';
        untilInput.style.display = recurEndTypeSelect.value === 'until' ? '' : 'none';
      });
    }

    if (endDateInput.value) {
      timeGroup.style.display = 'none';
      endTimeGroup.style.display = 'none';
    } else if (!timeInput.value) {
      endTimeGroup.style.display = 'none';
    }
    endDateInput.addEventListener('input', () => {
      const has = endDateInput.value !== '';
      timeGroup.style.display = has ? 'none' : '';
      endTimeGroup.style.display = has ? 'none' : '';
    });
    timeInput.addEventListener('input', () => {
      endTimeGroup.style.display = timeInput.value ? '' : 'none';
    });

    const btns = document.createElement('div');
    btns.className = 'modal-buttons';

    if (showDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'modal-btn modal-btn-danger modal-btn-delete';
      deleteBtn.textContent = 'Delete';
      let armed = false;
      deleteBtn.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          deleteBtn.textContent = 'Confirm?';
          setTimeout(() => { if (armed) { armed = false; deleteBtn.textContent = 'Delete'; } }, 2500);
        } else {
          close({ _deleted: true });
        }
      });
      btns.appendChild(deleteBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'modal-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => close(null));

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'modal-btn modal-btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      if (!text) { textInput.style.outline = '2px solid #dc2626'; textInput.focus(); return; }
      textInput.style.outline = '';
      let recurrence = null;
      if (showRecurrence && freqSelect && freqSelect.value) {
        recurrence = { freq: freqSelect.value };
        if (recurEndTypeSelect.value === 'count' && countInput.value) {
          recurrence.count = parseInt(countInput.value, 10);
        } else if (recurEndTypeSelect.value === 'until' && untilInput.value) {
          recurrence.until = untilInput.value.replace(/-/g, '');
        }
      }
      close({ text, time: timeInput.value, endTime: endTimeInput.value, endDate: endDateInput.value, category: catInput.value.trim(), notes: notesInput.value.trim(), recurrence });
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(saveBtn);
    form.appendChild(btns);

    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
        e.preventDefault(); saveBtn.click();
      }
    });

    return form;
  });
}

function categoryHue(cat) {
  if (!cat) return null;
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function showToast(message, error = false) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (error ? '' : ' toast-info');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function saveEvents() {
  fetch('events.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events)
  }).then(res => {
    if (!res.ok) showToast('Error saving events: server returned ' + res.status, true);
  }).catch(() => showToast('Error saving events: could not reach server', true));
}

async function addEventForDate(dateText) {
  const result = await showEventForm('Add event - ' + dateText, {
    text: '', time: '', endTime: '', endDate: '', category: '', notes: '', recurrence: null
  }, true, false);
  if (!result) return;
  if (!events[dateText]) events[dateText] = [];
  const newEvent = { text: result.text, time: result.time, endTime: result.endTime, category: result.category, notes: result.notes };
  if (result.endDate) newEvent.endDate = result.endDate;
  if (result.recurrence) newEvent.recurrence = result.recurrence;
  events[dateText].push(newEvent);
  events[dateText].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
  saveEvents();
  generateCalendar();
}

function createDayElement(dateText, hue, isToday, isWeekend, displayEvents) {
  const dayElement = document.createElement('div');
  dayElement.classList.add('day');
  dayElement.style.setProperty('--hue', hue);
  if (isWeekend) dayElement.classList.add('weekend');
  if (isToday) dayElement.classList.add('today');

  const dateTextElement = document.createElement('div');
  dateTextElement.textContent = dateText;
  dateTextElement.style.textAlign = 'center';
  dateTextElement.style.fontWeight = 'bold';
  dateTextElement.style.fontSize = '0.75em';
  dayElement.appendChild(dateTextElement);

  dayElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    dayElement.classList.add('drag-over');
  });
  dayElement.addEventListener('dragleave', () => {
    dayElement.classList.remove('drag-over');
  });
  dayElement.addEventListener('drop', (e) => {
    e.preventDefault();
    dayElement.classList.remove('drag-over');
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    const { baseDate, baseIndex } = data;
    if (baseDate === dateText) return;
    const event = events[baseDate][baseIndex];
    const copying = e.ctrlKey;
    if (!copying) {
      events[baseDate].splice(baseIndex, 1);
      if (events[baseDate].length === 0) delete events[baseDate];
    }
    const movedEvent = { ...event };
    const oldEndDate = eventEndDate(event);
    if (oldEndDate) {
      const spanDays = Math.round(
        (new Date(oldEndDate + 'T00:00:00') - new Date(baseDate + 'T00:00:00')) / 86400000
      );
      const newEnd = new Date(dateText + 'T00:00:00');
      newEnd.setDate(newEnd.getDate() + spanDays);
      movedEvent.endDate = toDateStr(newEnd);
    }
    if (!events[dateText]) events[dateText] = [];
    events[dateText].push(movedEvent);
    events[dateText].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
    saveEvents();
    generateCalendar();
  });

  dayElement.addEventListener('click', () => addEventForDate(dateText));

  const query = getSearchQuery();
  const visibleEvents = query
    ? displayEvents.filter(e =>
        eventText(e).toLowerCase().includes(query) ||
        eventCategory(e).toLowerCase().includes(query) ||
        eventNotes(e).toLowerCase().includes(query))
    : displayEvents;

  visibleEvents.forEach((event) => {
    const isOriginal = event._baseDate === dateText;
    const baseDate = event._baseDate;
    const baseIndex = event._baseIndex;

      const eventElement = document.createElement('div');
      eventElement.classList.add('event');
      eventElement.addEventListener('click', (e) => e.stopPropagation());
      if (!isOriginal) eventElement.classList.add('event-recurrence');
      if (eventDone(event)) eventElement.classList.add('event-done');
      if (isOriginal) {
        eventElement.draggable = true;
        eventElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ baseDate, baseIndex }));
          e.stopPropagation();
        });
      }
      const catHue = categoryHue(eventCategory(event));
      if (catHue !== null) {
        eventElement.classList.add('event-cat');
        eventElement.style.setProperty('--cat-hue', catHue);
      }

      const label = document.createElement('span');
      const t = eventTime(event);
      const et = eventEndTime(event);
      const timePrefix = t ? (et ? t + '-' + et : t) + ' ' : '';
      const recurSuffix = eventRecurrence(event) ? ' ↻' : '';
      const ed = eventEndDate(event);
      const spanPrefix = (ed && !isOriginal) ? '↦ ' : '';
      const spanSuffix = (ed && isOriginal) ? ' ↦' : '';
      label.textContent = spanPrefix + timePrefix + eventText(event) + recurSuffix + spanSuffix;
      label.title = label.textContent + (eventNotes(event) ? '\n' + eventNotes(event) : '');
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        editEvent(baseDate, baseIndex, dateText);
      });

      const deleteBtn = document.createElement('span');
      deleteBtn.classList.add('event-delete');
      deleteBtn.textContent = '×';
      if (isOriginal) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!await showConfirm('Delete "' + eventText(event) + '"?', 'Delete')) return;
          events[baseDate].splice(baseIndex, 1);
          if (events[baseDate].length === 0) delete events[baseDate];
          saveEvents();
          generateCalendar();
        });
      }

      const checkBtn = document.createElement('span');
      checkBtn.classList.add('event-check');
      checkBtn.textContent = eventDone(event) ? '✓' : '○';
      if (isOriginal) {
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          events[baseDate][baseIndex].done = !events[baseDate][baseIndex].done;
          saveEvents();
          generateCalendar();
        });
      }

      eventElement.appendChild(label);
      eventElement.appendChild(checkBtn);
      eventElement.appendChild(deleteBtn);
      dayElement.appendChild(eventElement);
  });

  return dayElement;
}

function exportIcal() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  const now = new Date();
  const dtstamp = now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') + 'T' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0') +
    String(now.getUTCSeconds()).padStart(2, '0') + 'Z';

  function uidHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function pushVEvent(eventDate, ev, uid, recurId) {
    const [year, month, day] = eventDate.split('-');
    const time = eventTime(ev);
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTAMP:' + dtstamp);
    if (recurId) lines.push('RECURRENCE-ID' + (time ? '' : ';VALUE=DATE') + ':' + recurId);
    if (time) {
      const [hh, mm] = time.split(':');
      const start = new Date(+year, +month - 1, +day, +hh, +mm);
      const endTimeVal = eventEndTime(ev);
      const end = endTimeVal
        ? (() => { const [eh, em] = endTimeVal.split(':'); return new Date(+year, +month - 1, +day, +eh, +em); })()
        : new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = d => d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0') + 'T' +
        String(d.getHours()).padStart(2, '0') +
        String(d.getMinutes()).padStart(2, '0') + '00';
      lines.push('DTSTART:' + fmt(start));
      lines.push('DTEND:' + fmt(end));
    } else {
      const fmtDate = d => d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0');
      const endDateVal = eventEndDate(ev);
      const dtEnd = endDateVal
        ? (() => { const d2 = new Date(endDateVal + 'T00:00:00'); d2.setDate(d2.getDate() + 1); return d2; })()
        : new Date(+year, +month - 1, +day + 1);
      lines.push('DTSTART;VALUE=DATE:' + year + month + day);
      lines.push('DTEND;VALUE=DATE:' + fmtDate(dtEnd));
    }
    lines.push('SUMMARY:' + eventText(ev).replace(/[\\;,]/g, c => '\\' + c));
    if (!recurId) {
      const recur = eventRecurrence(ev);
      if (recur) {
        let rrule = 'RRULE:FREQ=' + recur.freq;
        if (recur.count) rrule += ';COUNT=' + recur.count;
        else if (recur.until) rrule += ';UNTIL=' + recur.until;
        lines.push(rrule);
      }
      if (ev.exceptions) {
        const exdates = Object.entries(ev.exceptions)
          .filter(([, v]) => v === null)
          .map(([d]) => d.replace(/-/g, ''));
        if (exdates.length > 0) {
          if (time) {
            lines.push('EXDATE:' + exdates.map(d => d + 'T' + time.replace(':', '') + '00').join(','));
          } else {
            lines.push('EXDATE;VALUE=DATE:' + exdates.join(','));
          }
        }
      }
    }
    const cat = eventCategory(ev);
    if (cat) lines.push('CATEGORIES:' + cat.replace(/[\\;,]/g, c => '\\' + c));
    const notes = eventNotes(ev);
    if (notes) lines.push('DESCRIPTION:' + notes.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n'));
    lines.push('END:VEVENT');
  }

  for (const [date, dayEvents] of Object.entries(events)) {
    for (const event of dayEvents) {
      const time = eventTime(event);
      const uidKey = date + '\x00' + eventText(event) + '\x00' + time + '\x00' + eventCategory(event);
      const uid = uidHash(uidKey) + '@calendar';
      pushVEvent(date, event, uid, null);
      if (event.exceptions) {
        for (const [excDate, excVal] of Object.entries(event.exceptions)) {
          if (!excVal) continue;
          const recurId = time
            ? excDate.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'
            : excDate.replace(/-/g, '');
          pushVEvent(excDate, excVal, uid, recurId);
        }
      }
    }
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'events.ics';
  a.click();
  URL.revokeObjectURL(url);
}

function icalUnescape(s) {
  return s.replace(/\\n/gi, '\n').replace(/\\;/g, ';').replace(/\\,/g, ',').replace(/\\\\/g, '\\');
}

function parseIcalDateTime(value) {
  if (/^\d{8}$/.test(value)) {
    return { date: value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6, 8), time: '' };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!m) return { date: '', time: '' };
  const [, y, mo, d, h, mi] = m;
  if (value.endsWith('Z')) {
    const utc = new Date(y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':00Z');
    return {
      date: toDateStr(utc),
      time: String(utc.getHours()).padStart(2, '0') + ':' + String(utc.getMinutes()).padStart(2, '0')
    };
  }
  return { date: y + '-' + mo + '-' + d, time: h + ':' + mi };
}

function parseIcalRrule(rrule) {
  const parts = {};
  for (const part of rrule.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1) parts[part.slice(0, eq)] = part.slice(eq + 1);
  }
  const freq = parts['FREQ'];
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
  const result = { freq };
  if (parts['COUNT']) result.count = parseInt(parts['COUNT'], 10);
  else if (parts['UNTIL']) result.until = parts['UNTIL'].slice(0, 8);
  return result;
}

function importIcal(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  let inEvent = false;
  const props = {};
  let imported = 0;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      Object.keys(props).forEach(k => delete props[k]);
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      const summary = props['SUMMARY'];
      const dtstart = props['DTSTART'];
      if (summary && dtstart) {
        const text = icalUnescape(summary).trim();
        const { date: startDate, time: startTime } = parseIcalDateTime(dtstart);
        if (text && startDate) {
          let endDate = '', endTime = '';
          const dtend = props['DTEND'];
          if (dtend) {
            const { date: ed, time: et } = parseIcalDateTime(dtend);
            if (!startTime && ed && ed !== startDate) {
              const endD = new Date(ed + 'T00:00:00');
              endD.setDate(endD.getDate() - 1);
              const adj = toDateStr(endD);
              if (adj > startDate) endDate = adj;
            } else if (startTime && et) {
              endTime = et;
            }
          }
          const notes = props['DESCRIPTION'] ? icalUnescape(props['DESCRIPTION']).trim() : '';
          const cat = props['CATEGORIES'] ? icalUnescape(props['CATEGORIES']).split(',')[0].trim() : '';
          const recurrence = props['RRULE'] ? parseIcalRrule(props['RRULE']) : null;
          const newEvent = { text, time: startTime, endTime, category: cat, notes };
          if (endDate) newEvent.endDate = endDate;
          if (recurrence) newEvent.recurrence = recurrence;
          if (!events[startDate]) events[startDate] = [];
          events[startDate].push(newEvent);
          events[startDate].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
          imported++;
        }
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const propName = line.slice(0, colonIdx).split(';')[0].toUpperCase();
      props[propName] = line.slice(colonIdx + 1);
    }
  }
  return imported;
}

function backupEvents() {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'events.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('json-restore').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    let data;
    try { data = JSON.parse(ev.target.result); } catch {
      showToast('Invalid JSON file', true);
      e.target.value = '';
      return;
    }
    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
      showToast('Invalid backup format', true);
      e.target.value = '';
      return;
    }
    if (!await showConfirm('Replace all current events with the backup? This cannot be undone.', 'Restore')) {
      e.target.value = '';
      return;
    }
    events = data;
    e.target.value = '';
    saveEvents();
    generateCalendar();
    showToast('Events restored from backup');
  };
  reader.readAsText(file);
});

document.getElementById('ical-import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const count = importIcal(ev.target.result);
    e.target.value = '';
    saveEvents();
    generateCalendar();
    showToast('Imported ' + count + ' event' + (count !== 1 ? 's' : ''));
  };
  reader.readAsText(file);
});

document.addEventListener('keydown', async (event) => {
  if (!document.getElementById('modal-overlay').classList.contains('modal-hidden')) return;
  if (document.activeElement === document.getElementById('search')) return;
  if (event.key === '/') {
    event.preventDefault();
    document.getElementById('search').focus();
    return;
  }
  if (event.key === 'ArrowUp') {
    currentDate.setDate(currentDate.getDate() - (viewMode === 'day' ? 1 : 7));
    generateCalendar();
  } else if (event.key === 'ArrowDown') {
    currentDate.setDate(currentDate.getDate() + (viewMode === 'day' ? 1 : 7));
    generateCalendar();
  } else if (event.key === 'w') {
    nWeeks = 1;
    localStorage.setItem('nWeeks', nWeeks);
    generateCalendar();
  } else if (event.key === 'm') {
    nWeeks = 4;
    localStorage.setItem('nWeeks', nWeeks);
    generateCalendar();
  } else if (event.key === '+') {
    if (nWeeks < 52) { nWeeks++; localStorage.setItem('nWeeks', nWeeks); generateCalendar(); }
  } else if (event.key === '=') {
    if (nWeeks < 52) { nWeeks++; localStorage.setItem('nWeeks', nWeeks); generateCalendar(); }
  } else if (event.key === '-') {
    if (nWeeks > 1) {
      nWeeks--;
      localStorage.setItem('nWeeks', nWeeks);
      generateCalendar();
    }
  } else if (event.key === 't') {
    currentDate = new Date();
    generateCalendar();
  } else if (event.key === 'n') {
    addEventForDate(toDateStr(new Date()));
  } else if (event.key === 'l') {
    viewMode = viewMode === 'agenda' ? 'calendar' : 'agenda';
    generateCalendar();
  } else if (event.key === 'd') {
    viewMode = viewMode === 'day' ? 'calendar' : 'day';
    generateCalendar();
  } else if (event.key === 'T') {
    toggleTheme();
  } else if (event.key === '?') {
    toggleInstructions();
  } else if (event.key === 'b') {
    backupEvents();
  } else if (event.key === 'r') {
    document.getElementById('json-restore').click();
  } else if (event.key === 'e') {
    exportIcal();
  } else if (event.key === 'i') {
    document.getElementById('ical-import').click();
  } else if (event.key === 's') {
    weekStart = weekStart === 0 ? 1 : 0;
    localStorage.setItem('weekStart', weekStart);
    showToast('Week starts on ' + (weekStart === 1 ? 'Monday' : 'Sunday'));
    generateCalendar();
  } else if (event.key === 'g') {
    const dateStr = await showDateDialog(toDateStr(currentDate));
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return;
    currentDate = d;
    viewMode = 'calendar';
    generateCalendar();
  } else if (event.key === 'Escape') {
    const instructions = document.querySelector('.instructions');
    if (!instructions.classList.contains('instructions-hidden')) {
      instructions.classList.add('instructions-hidden');
    }
  }
});

let wheelCooldown = null;
document.addEventListener('wheel', (e) => {
  if (e.target.closest('.day-view')) return;
  e.preventDefault();
  if (wheelCooldown) return;
  currentDate.setDate(currentDate.getDate() + (e.deltaY > 0 ? 7 : -7));
  generateCalendar();
  wheelCooldown = setTimeout(() => { wheelCooldown = null; }, 200);
}, { passive: false });
