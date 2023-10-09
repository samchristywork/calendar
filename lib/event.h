#ifndef EVENT_H
#define EVENT_H

#include <datetime.h>
#include <string>

using namespace std;

class Event {
public:
  Event(string s);
  Event(string name, DateTime *dt, Duration *d) {
    this->name = name;
    time = dt;
    duration = d;
  }
  void delay(Duration s);
  void offset(Duration s);
  void setName(string s);
  bool equals(DateTime dt);
  bool isAfter(DateTime dt);
  bool isBefore(DateTime dt);
  bool isDuring(DateTime dt);
  string toString();

private:
  string name;
  DateTime *time;
  Duration *duration;
};

#endif
