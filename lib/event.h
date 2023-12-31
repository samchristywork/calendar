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
  void markForDeletion() { markedForDeletion = true; }
  bool isMarkedForDeletion() { return markedForDeletion; }
  Duration *getDuration() { return duration; }
  DateTime *getTime() { return time; }
  string getName() { return name; }
  string toString();

private:
  string name;
  DateTime *time;
  Duration *duration;
  bool markedForDeletion = false;
};

#endif
