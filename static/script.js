function toggleInstructions() {
  const instructions = document.querySelector('.instructions');
  instructions.classList.toggle('instructions-hidden');
}

const calendar = document.getElementById('calendar');
let nWeeks = parseInt(localStorage.getItem('nWeeks'), 10) || 8;
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

function generateWeek(currentDay) {
  const weekElement = document.createElement('div');
  weekElement.classList.add('row');
  weekElement.style.height = 'calc((100vh - 2rem) / ' + nWeeks + ')';

  for (let i = 0; i < 7; i++) {
    const dateText = "" +
      currentDay.getFullYear() + "-" +
      (currentDay.getMonth() + 1).toString().padStart(2, '0') + "-" +
      currentDay.getDate().toString().padStart(2, '0');
    const isToday = (currentDay.toDateString() === new Date().toDateString());
    const dayElement = createDayElement(dateText, hash(currentDay.getMonth()), isToday, i);
    currentDay.setDate(currentDay.getDate() + 1);
    weekElement.appendChild(dayElement);
  }

  return weekElement;
}

let currentDate = new Date();
function generateCalendar() {
  let lastSunday = new Date(currentDate);
  lastSunday.setDate(currentDate.getDate() - currentDate.getDay());
  let currentDay = new Date(lastSunday);
  calendar.innerHTML = '';

  for (let i = 0; i < nWeeks; i++) {
    calendar.appendChild(generateWeek(currentDay));
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
function eventCategory(e) { return typeof e === 'string' ? '' : (e.category || ''); }
function normalizeTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return h.padStart(2, '0') + ':' + (m || '00');
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

function saveEvents() {
  fetch('events.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events)
  }).catch(error => console.error('Error saving events:', error));
}

function createDayElement(dateText, hue, isToday, dayOfWeek) {
  const dayElement = document.createElement('div');
  dayElement.classList.add('day');
  dayElement.style.backgroundColor = 'hsla(' + hue + ', 100%, 90%)';

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayElement.style.backgroundColor = 'hsla(' + hue + ', 90%, 85%)';
  }

  if (isToday) {
    dayElement.style.border = '2px solid rgba(0, 0, 0, 0.5)';
  }

  const dateTextElement = document.createElement('div');
  dateTextElement.textContent = dateText;
  dateTextElement.style.textAlign = 'center';
  dateTextElement.style.fontWeight = 'bold';
  dateTextElement.style.fontSize = '0.75em';
  dayElement.appendChild(dateTextElement);

  dayElement.addEventListener('click', () => {
    const text = prompt("Add an event for " + dateText + ":");
    if (!text) return;
    const time = promptTime("Time (HH:MM, or leave blank):");
    if (time === null) return;
    const category = prompt("Category (or leave blank):") || '';
    if (!events[dateText]) events[dateText] = [];
    events[dateText].push({ text: text.trim(), time: time, category: category.trim() });
    events[dateText].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
    saveEvents();
    generateCalendar();
  });

  if (events[dateText]) {
    events[dateText].forEach((event, index) => {
      const eventElement = document.createElement('div');
      eventElement.classList.add('event');
      const catHue = categoryHue(eventCategory(event));
      if (catHue !== null) {
        eventElement.style.backgroundColor = 'hsla(' + catHue + ', 70%, 80%, 0.9)';
      }

      const label = document.createElement('span');
      const t = eventTime(event);
      label.textContent = t ? t + ' ' + eventText(event) : eventText(event);
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const updatedText = prompt("Edit event:", eventText(event));
        if (updatedText === null) return;
        if (updatedText.trim() === '') {
          events[dateText].splice(index, 1);
          if (events[dateText].length === 0) delete events[dateText];
        } else {
          const updatedTime = promptTime("Time (HH:MM, or leave blank):", eventTime(event));
          if (updatedTime === null) return;
          const updatedCategory = prompt("Category (or leave blank):", eventCategory(event));
          if (updatedCategory === null) return;
          events[dateText][index] = { text: updatedText.trim(), time: updatedTime.trim(), category: updatedCategory.trim() };
          events[dateText].sort((a, b) => normalizeTime(eventTime(a)).localeCompare(normalizeTime(eventTime(b))));
        }
        saveEvents();
        generateCalendar();
      });

      const deleteBtn = document.createElement('span');
      deleteBtn.classList.add('event-delete');
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        events[dateText].splice(index, 1);
        if (events[dateText].length === 0) delete events[dateText];
        saveEvents();
        generateCalendar();
      });

      eventElement.appendChild(label);
      eventElement.appendChild(deleteBtn);
      dayElement.appendChild(eventElement);
    });
  }

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
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const fmt = d => d.getUTCFullYear() +
          String(d.getUTCMonth() + 1).padStart(2, '0') +
          String(d.getUTCDate()).padStart(2, '0') + 'T' +
          String(d.getUTCHours()).padStart(2, '0') +
          String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
        lines.push('DTSTART:' + fmt(start));
        lines.push('DTEND:' + fmt(end));
      } else {
        const next = new Date(+year, +month - 1, +day + 1);
        const fmtDate = d => d.getFullYear() +
          String(d.getMonth() + 1).padStart(2, '0') +
          String(d.getDate()).padStart(2, '0');
        lines.push('DTSTART;VALUE=DATE:' + year + month + day);
        lines.push('DTEND;VALUE=DATE:' + fmtDate(next));
      }
      lines.push('SUMMARY:' + eventText(event).replace(/[\\;,]/g, c => '\\' + c));
      const cat = eventCategory(event);
      if (cat) lines.push('CATEGORIES:' + cat.replace(/[\\;,]/g, c => '\\' + c));
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

document.addEventListener('keydown', (event) => {
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
    nWeeks++;
    localStorage.setItem('nWeeks', nWeeks);
    generateCalendar();
  } else if (event.key === '=') {
    nWeeks++;
    localStorage.setItem('nWeeks', nWeeks);
    generateCalendar();
  } else if (event.key === '-') {
    if (nWeeks > 1) {
      nWeeks--;
      localStorage.setItem('nWeeks', nWeeks);
      generateCalendar();
    }
  } else if (event.key === 't') {
    currentDate = new Date();
    generateCalendar();
  } else if (event.key === '?') {
    toggleInstructions();
  } else if (event.key === 'e') {
    exportIcal();
  } else if (event.key === 'Escape') {
    const instructions = document.querySelector('.instructions');
    if (!instructions.classList.contains('instructions-hidden')) {
      instructions.classList.add('instructions-hidden');
    }
  }
});
