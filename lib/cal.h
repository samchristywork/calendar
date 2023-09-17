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
  vector<Event *> getEventsBetween(DateTime start, DateTime end);

private:
  vector<Event *> events;
};

#endif
