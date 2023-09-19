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
  int currentYear = localtime(&t)->tm_year + 1900;
  int currentMonth = localtime(&t)->tm_mon + 1;
  int currentDay = localtime(&t)->tm_mday;

  setCursorPosition(0, 0);

  }

  setCursorPosition(0, 0);

  makeCursorVisible();
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
