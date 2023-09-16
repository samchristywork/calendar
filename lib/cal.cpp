#include <cal.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

void Calendar::addEvent(Event *event) { events.push_back(event); }

Event *Calendar::findEvent(string s) {
  Event *event = new Event(s);

  for (int i = 0; i < events.size(); i++) {
    if (events[i]->toString() == event->toString()) {
      return events[i];
    }
  }

  return NULL;
}

string Calendar::serialize() {
  stringstream ss;

  for (int i = 0; i < events.size(); i++) {
    ss << events[i]->toString() << endl;
  }

  return ss.str();
}

void Calendar::readFromFile(string filename) {
  ifstream file(filename);
  string line;
  while (getline(file, line)) {
    addEvent(new Event(line));
  }
}

void Calendar::writeToFile(string filename) {
  ofstream file(filename);
  file << serialize();
}

vector<Event *> Calendar::getEventsBetween(DateTime start, DateTime end) {
  vector<Event *> eventsBetween;

  for (int i = 0; i < events.size(); i++) {
    if (events[i]->isAfter(start) && events[i]->isBefore(end)) {
      eventsBetween.push_back(events[i]);
    }
  }

  return eventsBetween;
}
