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


int main() {
  time_t t = time(NULL);
  int currentYear = localtime(&t)->tm_year + 1900;
  int currentMonth = localtime(&t)->tm_mon + 1;
  int currentDay = localtime(&t)->tm_mday;

  Calendar cal;
  cal.readFromFile("calendar.txt");

  DateTime start(currentYear, currentMonth, currentDay, 0, 0, 0);
  DateTime end(currentYear, currentMonth, currentDay, 23, 59, 59);
  auto events = cal.getEventsBetween(start, end);
  for (unsigned int i = 0; i < events.size(); i++) {
    cout << events[i]->toString() << endl;
  }

  cal.addEvent(new Event("Foo", new DateTime(2023, 1, 1, 0, 0, 0),
                         new Duration(1, 0, 0)));

  cal.writeToFile("calendar2.txt");
}
