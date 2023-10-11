#include <cal.h>
#include <iostream>
#include <stdlib.h>
#include <strings.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>
#include <vector>

Event *toBeAdded = NULL;
char lastInput[4] = {0, 0, 0, 0};
string statusline = "";
int scroll = 4;
string currentActivity = "";

void clearScreen() { cout << "\033[2J"; }

void alternateScreen() { cout << "\033[?1049h\033[H"; }

void normalScreen() { cout << "\033[?1049l"; }

void setRawTerminal() {
  struct termios t;
  tcgetattr(STDIN_FILENO, &t);
  t.c_lflag &= ~(ICANON | ECHO);
  tcsetattr(STDIN_FILENO, TCSANOW, &t);
}

void resetTerminal() {
  struct termios t;
  tcgetattr(STDIN_FILENO, &t);
  t.c_lflag |= (ICANON | ECHO);
  tcsetattr(STDIN_FILENO, TCSANOW, &t);
}

void setCursorPosition(int x, int y) {
  cout << "\033[" << y << ";" << x << "H";
}

void invertColors() { cout << "\033[7m"; }

void resetColors() { cout << "\033[0m"; }

void makeCursorInvisible() { cout << "\033[?25l"; }

void makeCursorVisible() { cout << "\033[?25h"; }

void yellow() { cout << "\033[33m"; }

void green() { cout << "\033[32m"; }

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

void render(Calendar &cal) {
  vector<Event *> currentEvents = cal.getEventsAtTime(DateTime(time(NULL)));
  if (currentEvents.size() > 0) {
    string name = currentEvents[0]->getName();
    if (name != currentActivity) {
      currentActivity = name;
      string command = "espeak -v en \"" + name + "\"";
      system(command.c_str());
    }
  }

  makeCursorInvisible();

  time_t t = time(NULL);
  int year = localtime(&t)->tm_year + 1900;
  int month = localtime(&t)->tm_mon + 1;
  int day = localtime(&t)->tm_mday;
  int hour = localtime(&t)->tm_hour;
  int minute = localtime(&t)->tm_min;

  setCursorPosition(0, 0);
  cout << statusline;

  int start = 8 + scroll;
  int end = 20 + scroll;
  for (int i = start * 4; i < end * 4; i++) {
    setCursorPosition(0, (i - start * 4) + 2);

    int h = i / 4;
    int m = i % 4;

    DateTime start(year, month, day, h, m * 15, 0);
    DateTime end(year, month, day, h, m * 15 + 14, 59);

    if (toBeAdded != NULL && toBeAdded->isDuring(start)) {
      green();
    }

    if (hour == h && minute / 15 == m) {
      invertColors();
    }

    if (h < 10) {
      cout << " ";
    }

    cout << h % 24 << ":" << leftPad(to_string(m * 15), 2, '0') << "  ";

    {
      vector<Event *> events = cal.getEventsAtTime(start);
      if (events.size() > 0) {
        cout << events.size() << "  ";
      } else {
        cout << "   ";
      }
    }

    vector<Event *> events = cal.getEventsStartingBetween(start, end);

    if (events.size() > 0) {
      cout << events[0]->getDuration()->toString();
      cout << "  ";
      cout << events[0]->getName();
    }

    resetColors();

    cout << endl;
  }

  setCursorPosition(0, 0);

  makeCursorVisible();
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

  cal.writeToFile("calendar.txt");
}
