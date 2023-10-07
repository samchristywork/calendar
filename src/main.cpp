#include <cal.h>
#include <iostream>
#include <termios.h>
#include <time.h>
#include <unistd.h>
#include <vector>

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

void render(Calendar &cal) {
  makeCursorInvisible();

  time_t t = time(NULL);
  int year = localtime(&t)->tm_year + 1900;
  int month = localtime(&t)->tm_mon + 1;
  int day = localtime(&t)->tm_mday;
  int hour = localtime(&t)->tm_hour;
  int minute = localtime(&t)->tm_min;
  int second = localtime(&t)->tm_sec;

  setCursorPosition(0, 0);
  cout << " Today: ";
  cout << year << "-" << month << "-" << day;
  cout << " ";
  cout << hour << ":" << minute << ":" << second;
  cout << endl;

  for (int i = 0; i < 24; i++) {
    setCursorPosition(0, i + 3);

    if (hour == i) {
      invertColors();
    }

    if (i < 10) {
      cout << " ";
    }
    cout << i << ":00\t";

    DateTime start(year, month, day, i, 0, 0);
    DateTime end(year, month, day, i, 59, 59);

    vector<Event *> events = cal.getEventsBetween(start, end);
    if (events.size() > 1) {
      yellow();
    }

    if (events.size() > 0) {
      cout << events[0]->toString();
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

int main() {
  Calendar cal;

  // Deserialization
  cal.readFromFile("calendar.txt");

  // Adding events
  cal.addEvent(new Event("Foo", new DateTime(2023, 1, 1, 0, 0, 0),
                         new Duration(1, 0, 0)));

  alternateScreen();
  setRawTerminal();

  resetTerminal();
  normalScreen();

  cal.writeToFile("calendar2.txt");
}
