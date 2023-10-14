#ifndef CAL_H
#define CAL_H

#include <datetime.h>
#include <event.h>
#include <string>
#include <vector>

using namespace std;

class Calendar {
public:
  void addEvent(Event *event);
  Event *findEvent(string s);
  string serialize();
  void readFromFile(string filename);
  void writeToFile(string filename);
  vector<Event *> getEventsStartingBetween(DateTime start, DateTime end);
  vector<Event *> getEventsAtTime(DateTime t);
  vector<Event *> getEventsAfter(DateTime t);
  vector<Event *> getEventsBefore(DateTime t);
  vector<Event *> getEvents() { return events; }

private:
  vector<Event *> events;
};

#endif
