#include <algorithm>
#include <cal.h>
#include <dirent.h>
#include <strings.h>
#include <terminal.h>

vector<Event *> selectedEvents = vector<Event *>();
char lastInput[4] = {0, 0, 0, 0};
int scroll = -2;
string currentActivity = "";
string statusline = "";
string filename = "calendar.txt";

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

string fixedWidth(string s, size_t width) {
  if (s.length() > width) {
    s = s.substr(0, width);
  } else {
    s = rightPad(s, width, ' ');
  }

  return s;
}

void renderLine(Calendar &cal, DateTime currentTime, int width) {
  string line = "";
  int lineOffset = 0;

  if (time(NULL) / 900 == currentTime.getEpoch() / 900) {
    line += invertColors();
    lineOffset += invertColors().length();
  }

  for (unsigned int i = 0; i < selectedEvents.size(); i++) {
    if (selectedEvents[i]->isDuring(DateTime(currentTime.getEpoch()))) {
      line += green();
      lineOffset += green().length();
    }
  }

  int h = currentTime.getHour();
  int m = currentTime.getMinute();

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

  line = fixedWidth(line, width + lineOffset);
  cout << line;

  resetColors();
}

void clearLine(int y, int width) {
  setCursorPosition(0, y);
  for (int x = 0; x < width; x++) {
    cout << " ";
  }
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

  clearLine(0, width);
  clearLine(1, width);

  makeCursorInvisible();

  setCursorPosition(0, 0);
  cout << statusline;

  for (int y = 3; y < height; y++) {
    int offset = y - 3 - 8 + scroll;

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

void generateEvent(Calendar &cal) {
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

  Duration *duration = new Duration(durationHoursInt, durationMinutesInt, 0);
  Event *event = new Event(name, dt, duration);
  selectedEvents.push_back(event);
  cal.addEvent(event);

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

void save(Calendar &cal) { cal.writeToFile(filename); }

void selectNextEvent(Calendar &cal) {
  int t = 0;

  if (selectedEvents.size() != 0) {
    t = selectedEvents[0]->getTime()->getEpoch();
  } else {
    t = time(NULL);
  }

  vector<Event *> events = cal.getEventsAfter(DateTime(t));
  if (events.size() > 0) {
    sort(events.begin(), events.end(), [](Event *a, Event *b) {
      return a->getTime()->getEpoch() < b->getTime()->getEpoch();
    });

    selectedEvents.clear();
    selectedEvents.push_back(events[0]);
  }
}

void selectPrevEvent(Calendar &cal) {
  int t = 0;

  if (selectedEvents.size() != 0) {
    t = selectedEvents[0]->getTime()->getEpoch();
  } else {
    t = time(NULL);
  }

  vector<Event *> events = cal.getEventsBefore(DateTime(t));
  if (events.size() > 0) {
    sort(events.begin(), events.end(), [](Event *a, Event *b) {
      return a->getTime()->getEpoch() > b->getTime()->getEpoch();
    });

    selectedEvents.clear();
    selectedEvents.push_back(events[0]);
  }
}

void listFiles(string dirname) {
  DIR *dir;
  struct dirent *ent;
  if ((dir = opendir(dirname.c_str())) != NULL) {
    while ((ent = readdir(dir)) != NULL) {
      if (ent->d_name[0] != '.') {
        cout << ent->d_name << endl;
      }
    }
    closedir(dir);
  } else {
    perror("opendir");
  }
}

void getTemplate(Calendar &cal) {
  resetTerminal();
  normalScreen();

  DateTime currentDatetime = DateTime(time(NULL));

  listFiles("templates");

  cout << "Template name: ";
  string name;
  getline(cin, name);

  Calendar templateCal;
  templateCal.readFromFile("templates/" + name);

  vector<Event *> events = templateCal.getEvents();
  for (unsigned int i = 0; i < events.size(); i++) {
    Event *event = events[i];
    DateTime *dt = event->getTime();
    dt->setYear(currentDatetime.getYear());
    dt->setMonth(currentDatetime.getMonth());
    dt->setDay(currentDatetime.getDay());
    cal.addEvent(event);
  }

  alternateScreen();
  clearScreen();
  setRawTerminal();
}

bool handleEvent(Calendar &cal) {
  if (checkInput('q')) {
    return false;
  } else if (checkInput('a')) {
    generateEvent(cal);
  } else if (checkInput('k')) {
    for (unsigned int i = 0; i < selectedEvents.size(); i++) {
      selectedEvents[i]->offset(Duration(0, -15, 0));
    }
  } else if (checkInput('j')) {
    for (unsigned int i = 0; i < selectedEvents.size(); i++) {
      selectedEvents[i]->offset(Duration(0, 15, 0));
    }
  } else if (checkInput('t')) {
    getTemplate(cal);
  } else if (checkInput(10)) {
    selectedEvents.clear();
    save(cal);
  } else if (checkInput('n')) {
    selectNextEvent(cal);
  } else if (checkInput('p')) {
    selectPrevEvent(cal);
  } else if (checkInput(27, 91, 65, 0)) {
    scroll--;
  } else if (checkInput(27, 91, 66, 0)) {
    scroll++;
  } else if (checkInput(27, 91, 53, 126)) {
    scroll -= getScreenHeight() / 2;
  } else if (checkInput(27, 91, 54, 126)) {
    scroll += getScreenHeight() / 2;
  }

  return true;
}

void updateStatusLine(Calendar &cal) {
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

  DateTime currentDatetime = DateTime(time(NULL));
  vector<Event *> currentEvents = cal.getEventsAtTime(currentDatetime);
  if (currentEvents.size() > 0) {
    statusline += currentEvents[0]->getName();
    statusline += " ";
  }
}

void eventLoop(Calendar &cal) {
  while (true) {
    if (!handleEvent(cal)) {
      break;
    }

    render(cal);
    readInput();
    updateStatusLine(cal);
  }
}

int main(int argc, char *argv[]) {
  if (argc == 2) {
    filename = argv[1];
  }

  Calendar cal;
  cal.readFromFile(filename);

  alternateScreen();
  clearScreen();
  setRawTerminal();
  eventLoop(cal);
  resetTerminal();
  normalScreen();

  save(cal);
}
