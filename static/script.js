function toggleInstructions() {
  const instructions = document.querySelector('.instructions');
  instructions.classList.toggle('instructions-hidden');
}

const calendar = document.getElementById('calendar');
let nWeeks = parseInt(localStorage.getItem('nWeeks'), 10) || 8;
let events = {};
events = fetch('events.json')
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
    const time = prompt("Time (HH:MM, or leave blank):") || '';
    if (!events[dateText]) events[dateText] = [];
    events[dateText].push({ text: text.trim(), time: time.trim() });
    events[dateText].sort((a, b) => eventTime(a).localeCompare(eventTime(b)));
    saveEvents();
    generateCalendar();
  });

  if (events[dateText]) {
    events[dateText].forEach((event, index) => {
      const eventElement = document.createElement('div');
      eventElement.classList.add('event');

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
          const updatedTime = prompt("Time (HH:MM, or leave blank):", eventTime(event));
          if (updatedTime === null) return;
          events[dateText][index] = { text: updatedText.trim(), time: updatedTime.trim() };
          events[dateText].sort((a, b) => eventTime(a).localeCompare(eventTime(b)));
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
  }
});
