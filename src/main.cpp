#include <cal.h>
#include <strings.h>
#include <terminal.h>

Event *toBeAdded = NULL;
char lastInput[4] = {0, 0, 0, 0};
string statusline = "";
int scroll = -2;
string currentActivity = "";

string leftPad(string s, size_t width, char c) {
  while (s.length() < width) {
    s = c + s;
  }

  return s;
}

string rightPad(string s, size_t width, char c) {
  while (s.length() < width) {
    s = s + c;
  }

  return s;
}

void renderLine(Calendar &cal, DateTime currentTime, int width) {
  if (time(NULL) / 900 == currentTime.getEpoch() / 900) {
    invertColors();
  }

  if (toBeAdded != NULL &&
      toBeAdded->isDuring(DateTime(currentTime.getEpoch()))) {
    green();
  }

  int h = currentTime.getHour();
  int m = currentTime.getMinute();

  string line = "";

  line += leftPad(to_string(h), 2, ' ');
  line += ":";
  line += leftPad(to_string(m), 2, '0');
  line += "  ";

  {
    vector<Event *> events = cal.getEventsAtTime(currentTime);
    if (events.size() > 0) {
      line += to_string(events.size());
      line += "  ";
    } else {
      line += "   ";
    }
  }

  DateTime start = currentTime;
  DateTime end = DateTime(currentTime.getEpoch() + 15 * 60);

  vector<Event *> events = cal.getEventsStartingBetween(start, end);

  if (events.size() > 0) {
    line += events[0]->getDuration()->toString();
    line += "  ";
    line += events[0]->getName();
  }

  line = line.substr(0, width);
  cout << line;

  resetColors();
}

void render(Calendar &cal) {
  vector<Event *> currentEvents = cal.getEventsAtTime(DateTime(time(NULL)));
  if (currentEvents.size() > 0) {
    string name = currentEvents[0]->getName();
    if (name != currentActivity) {
      currentActivity = name;
      string command = "espeak -v en \"" + name + "\" &";
      system(command.c_str());
    }
  }

  int height = getScreenHeight();
  int width = getScreenWidth();

  makeCursorInvisible();

  setCursorPosition(0, 0);
  cout << statusline;

  for (int y = 2; y < height; y++) {
    int offset = y - 2 - 8 + scroll;

    DateTime currentTime = DateTime(time(NULL));
    currentTime.setMinute(0);
    currentTime.setSecond(0);
    int epoch = currentTime.getEpoch();
    epoch += offset * 15 * 60;
    currentTime = DateTime(epoch);

    setCursorPosition(0, y);
    renderLine(cal, currentTime, width);
  }

  setCursorPosition(0, 0);

  makeCursorVisible();
  fflush(stdout);
}

void readInput() {
  bzero(lastInput, 4);

  struct timeval tv;
  fd_set fds;
  tv.tv_sec = 1;
  tv.tv_usec = 0;
  FD_ZERO(&fds);
  FD_SET(STDIN_FILENO, &fds);
  select(STDIN_FILENO + 1, &fds, NULL, NULL, &tv);
  if (FD_ISSET(STDIN_FILENO, &fds)) {
    bzero(lastInput, 4);
    read(STDIN_FILENO, lastInput, 4);
  }
}

void generateEvent() {
  resetTerminal();
  normalScreen();

  cout << "Name: ";
  string name;
  getline(cin, name);

  cout << "Duration (hours): ";
  string durationHours;
  getline(cin, durationHours);
  int durationHoursInt = stoi(durationHours);

  cout << "Duration (minutes): ";
  string durationMinutes;
  getline(cin, durationMinutes);
  int durationMinutesInt = stoi(durationMinutes);

  int s = time(NULL);

  DateTime *dt = new DateTime(s);
  dt->setSecond(0);
  dt->setMinute(dt->getMinute() / 15 * 15);
  toBeAdded = new Event(name, dt,
                        new Duration(durationHoursInt, durationMinutesInt, 0));

  alternateScreen();
  setRawTerminal();
}

bool checkInput(char c) {
  if (lastInput[0] == c && lastInput[1] == 0 && lastInput[2] == 0 &&
      lastInput[3] == 0) {
    return true;
  }
  return false;
}

bool checkInput(int c1, int c2, int c3, int c4) {
  if (lastInput[0] == c1 && lastInput[1] == c2 && lastInput[2] == c3 &&
      lastInput[3] == c4) {
    return true;
  }
  return false;
}

void save(Calendar &cal) { cal.writeToFile("calendar.txt"); }

void eventLoop(Calendar &cal) {
  while (true) {
    if (checkInput('q')) {
      break;
    } else if (checkInput('a')) {
      generateEvent();
      render(cal);
    } else if (checkInput('k')) {
      if (toBeAdded != NULL) {
        toBeAdded->offset(Duration(0, -15, 0));
        render(cal);
      }
    } else if (checkInput('j')) {
      if (toBeAdded != NULL) {
        toBeAdded->offset(Duration(0, 15, 0));
        render(cal);
      }
    } else if (checkInput('m')) {
      if (toBeAdded != NULL) {
        cal.addEvent(toBeAdded);
        toBeAdded = NULL;
        save(cal);
        render(cal);
      }
    } else if (checkInput(27, 91, 65, 0)) {
      clearScreen();
      scroll--;
      render(cal);
    } else if (checkInput(27, 91, 66, 0)) {
      clearScreen();
      scroll++;
      render(cal);
    } else {
      render(cal);
    }

    readInput();

    statusline = "";
    statusline += "(";
    statusline += to_string(lastInput[0]);
    statusline += ", ";
    statusline += to_string(lastInput[1]);
    statusline += ", ";
    statusline += to_string(lastInput[2]);
    statusline += ", ";
    statusline += to_string(lastInput[3]);
    statusline += ") ";

    vector<Event *> currentEvents = cal.getEventsAtTime(DateTime(time(NULL)));
    if (currentEvents.size() > 0) {
      statusline += currentEvents[0]->getName();
      statusline += " ";
    }
  }
}

int main() {
  Calendar cal;
  cal.readFromFile("calendar.txt");

  alternateScreen();
  clearScreen();
  setRawTerminal();
  eventLoop(cal);
  resetTerminal();
  normalScreen();

  save(cal);
}
