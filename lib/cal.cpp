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

  for (unsigned int i = 0; i < events.size(); i++) {
    if (events[i]->toString() == event->toString()) {
      return events[i];
    }
  }

  return NULL;
}

string Calendar::serialize() {
  stringstream ss;

  for (unsigned int i = 0; i < events.size(); i++) {
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

vector<Event *> Calendar::getEventsStartingBetween(DateTime start,
                                                   DateTime end) {
  vector<Event *> eventsBetween;

  for (unsigned int i = 0; i < events.size(); i++) {
    if (events[i]->equals(start) ||
        (events[i]->isAfter(start) && events[i]->isBefore(end))) {
      eventsBetween.push_back(events[i]);
    }
  }

  return eventsBetween;
}

vector<Event *> Calendar::getEventsAtTime(DateTime t) {
  vector<Event *> e;

  for (unsigned int i = 0; i < events.size(); i++) {
    if (events[i]->isDuring(t)) {
      e.push_back(events[i]);
    }
  }

  return e;
}

vector<Event *> Calendar::getEventsAfter(DateTime t) {
  vector<Event *> e;

  for (unsigned int i = 0; i < events.size(); i++) {
    if (events[i]->isAfter(t)) {
      e.push_back(events[i]);
    }
  }

  return e;
}

vector<Event *> Calendar::getEventsBefore(DateTime t) {
  vector<Event *> e;

  for (unsigned int i = 0; i < events.size(); i++) {
    if (events[i]->isBefore(t)) {
      e.push_back(events[i]);
    }
  }

  return e;
}
