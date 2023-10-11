#include <cal.h>
#include <iostream>
#include <stdlib.h>
#include <strings.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>
#include <vector>

Event *toBeAdded = NULL;
int scroll = 4;

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

string pad(int n, size_t width) {
  string s = to_string(n);
  while (s.length() < width) {
    s = "0" + s;
  }
  return s;
}

void render(Calendar &cal) {
  makeCursorInvisible();

  time_t t = time(NULL);
  int year = localtime(&t)->tm_year + 1900;
  int month = localtime(&t)->tm_mon + 1;
  int day = localtime(&t)->tm_mday;
  int hour = localtime(&t)->tm_hour;
  int minute = localtime(&t)->tm_min;

  setCursorPosition(0, 0);

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

    cout << h << ":" << pad(m * 15, 2) << "  ";

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

char readWithTimeout() {
  struct timeval tv;
  fd_set fds;
  tv.tv_sec = 0;
  tv.tv_usec = 100000;
  FD_ZERO(&fds);
  FD_SET(STDIN_FILENO, &fds);
  select(STDIN_FILENO + 1, &fds, NULL, NULL, &tv);
  if (FD_ISSET(STDIN_FILENO, &fds)) {
    char c;
    cin >> c;
    return c;
  } else {
    return 0;
  }
}

char readInput() {
  char c;
  cin >> c;
  return c;
}

string readLine() {
  string s;
  getline(cin, s);
  return s;
}

void generateEvent() {
  resetTerminal();
  normalScreen();

  cout << "Name: ";
  string name = readLine();

  cout << "Duration (hours): ";
  string durationHours = readLine();
  int durationHoursInt = stoi(durationHours);

  cout << "Duration (minutes): ";
  string durationMinutes = readLine();
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

void eventLoop(Calendar &cal) {
  char c = 0;
  while (true) {
    if (c == 'q') {
      break;
    } else if (c == 'a') {
      generateEvent();
      render(cal);
    } else if (c == 'k') {
      if (toBeAdded != NULL) {
        toBeAdded->offset(Duration(0, -15, 0));
        render(cal);
      }
    } else if (c == 'j') {
      if (toBeAdded != NULL) {
        toBeAdded->offset(Duration(0, 15, 0));
        render(cal);
      }
    } else if (c == 'm') {
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

    c = readInput();
  }
}

int main() {
  Calendar cal;

  // Deserialization
  cal.readFromFile("calendar.txt");

  alternateScreen();
  clearScreen();
  setRawTerminal();
  eventLoop(cal);
  resetTerminal();
  normalScreen();

  cal.writeToFile("calendar.txt");
}
