#ifndef TERMINAL_H
#define TERMINAL_H

#include <iostream>
#include <sys/ioctl.h>
#include <termios.h>
#include <unistd.h>

using namespace std;

inline void clearScreen() { cout << "\033[2J"; }

inline void alternateScreen() { cout << "\033[?1049h\033[H"; }

inline void normalScreen() { cout << "\033[?1049l"; }

inline void setRawTerminal() {
  struct termios t;
  tcgetattr(STDIN_FILENO, &t);
  t.c_lflag &= ~(ICANON | ECHO);
  tcsetattr(STDIN_FILENO, TCSANOW, &t);
}

inline void resetTerminal() {
  struct termios t;
  tcgetattr(STDIN_FILENO, &t);
  t.c_lflag |= (ICANON | ECHO);
  tcsetattr(STDIN_FILENO, TCSANOW, &t);
}

inline void setCursorPosition(int x, int y) {
  cout << "\033[" << y << ";" << x << "H";
}

inline void invertColors() { cout << "\033[7m"; }

inline void resetColors() { cout << "\033[0m"; }

inline void makeCursorInvisible() { cout << "\033[?25l"; }

inline void makeCursorVisible() { cout << "\033[?25h"; }

inline void yellow() { cout << "\033[33m"; }

inline void green() { cout << "\033[32m"; }

inline int getScreenHeight() {
  struct winsize w;
  ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);
  return w.ws_row;
}

inline int getScreenWidth() {
  struct winsize w;
  ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);
  return w.ws_col;
}

#endif
