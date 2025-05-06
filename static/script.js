function toggleInstructions() {
  const instructions = document.querySelector('.instructions');
  instructions.classList.toggle('instructions-hidden');
}

const calendar = document.getElementById('calendar');
let nWeeks = 8;
let events = {};
events = fetch('events.json')
  .then(response => response.json())
  .then(data => {
    events = data;
    generateCalendar();
  })
  .catch(error => {
    console.error('Error loading events:', error);
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
      (currentDay.getYear() + 1900) + "-" +
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
}

function createDayElement(dateText, hue, isToday, dayOfWeek) {
  const dayElement = document.createElement('div');
  dayElement.classList.add('day');
  dayElement.style.backgroundColor = 'hsla(' + hue + ', 100%, 85%)';

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayElement.style.backgroundColor = 'hsla(' + hue + ', 90%, 75%)';
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
    const response = prompt("Add an event for " + dateText + ":");
    if (response) {
      if (!events[dateText]) {
        events[dateText] = [];
      }
      events[dateText].push(response);
      generateCalendar();

      fetch('save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(events)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Events saved successfully:', data);
      })
      .catch(error => {
        console.error('Error saving events:', error);
      });
    }
  });

  if (events[dateText]) {
    events[dateText].forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.classList.add('event');
      eventElement.textContent = event;
      dayElement.appendChild(eventElement);
    });
  }

  return dayElement;
}

generateCalendar();

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') {
    currentDate.setDate(currentDate.getDate() - 7);
    generateCalendar();
  } else if (event.key === 'ArrowDown') {
    currentDate.setDate(currentDate.getDate() + 7);
    generateCalendar();
  } else if (event.key === 'w') {
    nWeeks = 1;
    generateCalendar();
  } else if (event.key === 'm') {
    nWeeks = 4;
    generateCalendar();
  } else if (event.key === '=') {
    nWeeks++;
    generateCalendar();
  } else if (event.key === '-') {
    if (nWeeks > 1) {
      nWeeks--;
      generateCalendar();
    }
  }
});
