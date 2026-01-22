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
    effective[date] = dayEvents.map((e, idx) => ({ ...e, _baseDate: date, _baseIndex: idx }));
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
          if (!effective[dateStr]) effective[dateStr] = [];
          effective[dateStr].push({ ...event, _baseDate: date, _baseIndex: idx });
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
    const dayElement = createDayElement(dateText, hash(currentDay.getMonth()), isToday, i, effectiveEvents[dateText] || []);
    currentDay.setDate(currentDay.getDate() + 1);
    weekElement.appendChild(dayElement);
  }

  return weekElement;
}

let currentDate = new Date();
let viewMode = 'calendar';

function editEvent(date, index) {
  const event = events[date][index];
  const updatedText = prompt("Edit event:", eventText(event));
  if (updatedText === null) return;
  if (updatedText.trim() === '') {
    events[date].splice(index, 1);
    if (events[date].length === 0) delete events[date];
  } else {
    const updatedEndDate = promptEndDate(date, eventEndDate(event));
    if (updatedEndDate === null) return;
    let updatedTime = '', updatedEndTime = '';
    if (!updatedEndDate) {
      const t = promptTime("Time (HH:MM, or leave blank):", eventTime(event));
      if (t === null) return;
      updatedTime = t;
      const et = updatedTime ? promptTime("End time (HH:MM, or leave blank):", eventEndTime(event)) : '';
      if (et === null) return;
      updatedEndTime = et;
    }
    const updatedCategory = prompt("Category (or leave blank):", eventCategory(event));
    if (updatedCategory === null) return;
    const updatedNotes = prompt("Notes (or leave blank):", eventNotes(event));
    if (updatedNotes === null) return;
    const updatedRecurrence = promptRecurrence(eventRecurrence(event));
    if (updatedRecurrence === null) return;
    const updatedEvent = { text: updatedText.trim(), time: updatedTime, endTime: updatedEndTime, category: updatedCategory.trim(), notes: updatedNotes.trim() };
    if (updatedEndDate) updatedEvent.endDate = updatedEndDate;
    if (updatedRecurrence) updatedEvent.recurrence = updatedRecurrence;
    if (events[date][index].done) updatedEvent.done = true;
    events[date][index] = updatedEvent;
    events[date].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
  }
  saveEvents();
  generateCalendar();
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
    if (isOriginal) titleSpan.addEventListener('click', () => editEvent(baseDate, baseIndex));
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
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete "' + eventText(event) + '"?')) return;
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

function generateCalendar() {
  if (viewMode === 'agenda') { generateAgenda(); return; }
  let lastSunday = new Date(currentDate);
  lastSunday.setDate(currentDate.getDate() - currentDate.getDay());
  const visibleStart = new Date(lastSunday);
  const visibleEnd = new Date(lastSunday);
  visibleEnd.setDate(visibleEnd.getDate() + nWeeks * 7 - 1);
  const effectiveEvents = buildEffectiveEvents(visibleStart, visibleEnd);
  let currentDay = new Date(lastSunday);
  calendar.innerHTML = '';

  for (let i = 0; i < nWeeks; i++) {
    calendar.appendChild(generateWeek(currentDay, effectiveEvents));
  }

  const sideLabel = document.getElementById('side-label');
  sideLabel.innerHTML = '';
  const seen = new Set();
  for (let i = 0; i < nWeeks * 7; i++) {
    const d = new Date(lastSunday);
    d.setDate(lastSunday.getDate() + i);
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

function promptEndDate(startDate, existing) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  let value = existing || '';
  while (true) {
    const raw = prompt("End date (YYYY-MM-DD for multi-day, or leave blank):", value);
    if (raw === null) return null;
    const input = raw.trim();
    if (input === '') return '';
    if (dateRe.test(input) && !isNaN(Date.parse(input)) && input > startDate) return input;
    alert('Enter a date after ' + startDate + ' in YYYY-MM-DD format, or leave blank.');
    value = input;
  }
}

function promptRecurrence(existing) {
  const freqs = ['daily', 'weekly', 'monthly', 'yearly'];
  const defaultFreq = existing ? existing.freq.toLowerCase() : '';
  let freq = '';
  while (true) {
    const raw = prompt("Repeat? (daily / weekly / monthly / yearly, or leave blank):", defaultFreq);
    if (raw === null) return null;
    const input = raw.trim().toLowerCase();
    if (input === '' || freqs.includes(input)) { freq = input; break; }
    alert('Enter: daily, weekly, monthly, yearly, or leave blank.');
  }
  if (!freq) return false;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const defaultEnd = existing ? (existing.count ? existing.count + 'x' : existing.until ? existing.until : '') : '';
  let end = null;
  while (true) {
    const raw = prompt("Ends after how many occurrences (e.g. 10x), by date (YYYY-MM-DD), or leave blank:", defaultEnd);
    if (raw === null) return null;
    const input = raw.trim();
    if (input === '') { break; }
    if (/^\d+x$/i.test(input)) { end = { count: parseInt(input) }; break; }
    if (dateRe.test(input) && !isNaN(Date.parse(input))) { end = { until: input.replace(/-/g, '') }; break; }
    alert('Enter a count like 10x, a date like 2026-12-31, or leave blank.');
  }
  return { freq: freq.toUpperCase(), ...(end || {}) };
}

function promptTime(message, defaultValue) {
  const timeRe = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  let value = defaultValue !== undefined ? defaultValue : '';
  while (true) {
    const input = prompt(message, value);
    if (input === null) return null;
    const trimmed = input.trim();
    if (trimmed === '' || timeRe.test(trimmed)) return trimmed;
    alert('Please enter a time in HH:MM format (e.g. 09:30), or leave blank.');
    value = trimmed;
  }
}

function stableHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
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

function addEventForDate(dateText) {
  const text = prompt("Add an event for " + dateText + ":");
  if (!text) return;
  const endDate = promptEndDate(dateText, '');
  if (endDate === null) return;
  let time = '', endTime = '';
  if (!endDate) {
    const t = promptTime("Time (HH:MM, or leave blank):");
    if (t === null) return;
    time = t;
    const et = time ? promptTime("End time (HH:MM, or leave blank):") : '';
    if (et === null) return;
    endTime = et;
  }
  const category = prompt("Category (or leave blank):");
  if (category === null) return;
  const notes = prompt("Notes (or leave blank):");
  if (notes === null) return;
  const recurrence = promptRecurrence(null);
  if (recurrence === null) return;
  if (!events[dateText]) events[dateText] = [];
  const newEvent = { text: text.trim(), time, endTime, category: category.trim(), notes: notes.trim() };
  if (endDate) newEvent.endDate = endDate;
  if (recurrence) newEvent.recurrence = recurrence;
  events[dateText].push(newEvent);
  events[dateText].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
  saveEvents();
  generateCalendar();
}

function createDayElement(dateText, hue, isToday, dayOfWeek, displayEvents) {
  const dayElement = document.createElement('div');
  dayElement.classList.add('day');
  dayElement.style.setProperty('--hue', hue);
  if (dayOfWeek === 0 || dayOfWeek === 6) dayElement.classList.add('weekend');
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
      if (isOriginal) {
        label.addEventListener('click', (e) => {
          e.stopPropagation();
          editEvent(baseDate, baseIndex);
        });
      }

      const deleteBtn = document.createElement('span');
      deleteBtn.classList.add('event-delete');
      deleteBtn.textContent = '×';
      if (isOriginal) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!confirm('Delete "' + eventText(event) + '"?')) return;
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

  for (const [date, dayEvents] of Object.entries(events)) {
    const [year, month, day] = date.split('-');
    for (const event of dayEvents) {
      const time = eventTime(event);
      const uidKey = date + '\x00' + eventText(event) + '\x00' + time + '\x00' + eventCategory(event);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + stableHash(uidKey) + '@calendar');
      lines.push('DTSTAMP:' + dtstamp);
      if (time) {
        const [hh, mm] = time.split(':');
        const start = new Date(+year, +month - 1, +day, +hh, +mm);
        const endTimeVal = eventEndTime(event);
        const end = endTimeVal
          ? (() => { const [eh, em] = endTimeVal.split(':'); return new Date(+year, +month - 1, +day, +eh, +em); })()
          : new Date(start.getTime() + 60 * 60 * 1000);
        const fmt = d => d.getUTCFullYear() +
          String(d.getUTCMonth() + 1).padStart(2, '0') +
          String(d.getUTCDate()).padStart(2, '0') + 'T' +
          String(d.getUTCHours()).padStart(2, '0') +
          String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
        lines.push('DTSTART:' + fmt(start));
        lines.push('DTEND:' + fmt(end));
      } else {
        const fmtDate = d => d.getFullYear() +
          String(d.getMonth() + 1).padStart(2, '0') +
          String(d.getDate()).padStart(2, '0');
        const endDateVal = eventEndDate(event);
        const dtEnd = endDateVal
          ? (() => { const d2 = new Date(endDateVal + 'T00:00:00'); d2.setDate(d2.getDate() + 1); return d2; })()
          : new Date(+year, +month - 1, +day + 1);
        lines.push('DTSTART;VALUE=DATE:' + year + month + day);
        lines.push('DTEND;VALUE=DATE:' + fmtDate(dtEnd));
      }
      lines.push('SUMMARY:' + eventText(event).replace(/[\\;,]/g, c => '\\' + c));
      const recur = eventRecurrence(event);
      if (recur) {
        let rrule = 'RRULE:FREQ=' + recur.freq;
        if (recur.count) rrule += ';COUNT=' + recur.count;
        else if (recur.until) rrule += ';UNTIL=' + recur.until;
        lines.push(rrule);
      }
      const cat = eventCategory(event);
      if (cat) lines.push('CATEGORIES:' + cat.replace(/[\\;,]/g, c => '\\' + c));
      const notes = eventNotes(event);
      if (notes) lines.push('DESCRIPTION:' + notes.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n'));
      lines.push('END:VEVENT');
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

document.addEventListener('keydown', (event) => {
  if (document.activeElement === document.getElementById('search')) return;
  if (event.key === '/') {
    event.preventDefault();
    document.getElementById('search').focus();
    return;
  }
  if (event.key === 'ArrowUp') {
    currentDate.setDate(currentDate.getDate() - 7);
    generateCalendar();
  } else if (event.key === 'ArrowDown') {
    currentDate.setDate(currentDate.getDate() + 7);
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
    toggleTheme();
  } else if (event.key === '?') {
    toggleInstructions();
  } else if (event.key === 'e') {
    exportIcal();
  } else if (event.key === 'i') {
    document.getElementById('ical-import').click();
  } else if (event.key === 'g') {
    const raw = prompt('Go to date (YYYY-MM-DD):', toDateStr(currentDate));
    if (!raw) return;
    const d = new Date(raw.trim() + 'T00:00:00');
    if (isNaN(d.getTime())) { alert('Enter a date in YYYY-MM-DD format.'); return; }
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
  e.preventDefault();
  if (wheelCooldown) return;
  currentDate.setDate(currentDate.getDate() + (e.deltaY > 0 ? 7 : -7));
  generateCalendar();
  wheelCooldown = setTimeout(() => { wheelCooldown = null; }, 200);
}, { passive: false });
