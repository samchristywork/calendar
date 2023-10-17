#include <event.h>
#include <util.h>
#include <vector>

Event::Event(string s) {
  vector<string> tokens = split(s, '\t');
  time = new DateTime(tokens[0]);
  duration = new Duration(tokens[1]);
  name = tokens[2];
}

void Event::delay(Duration d) {
  deprecationNotice("Event::delay(Duration)");

  time->delay(d);
}

void Event::offset(Duration d) {
  int eventEpoch = time->getEpoch();
  int offsetSeconds = d.getEpoch();
  time_t newEpoch = eventEpoch + offsetSeconds;

  delete time;
  time = new DateTime(newEpoch);
}

void Event::setName(string s) { name = s; }

bool Event::equals(DateTime dt) {
  if (time->getYear() == dt.getYear() && time->getMonth() == dt.getMonth() &&
      time->getDay() == dt.getDay() && time->getHour() == dt.getHour() &&
      time->getMinute() == dt.getMinute() &&
      time->getSecond() == dt.getSecond()) {
    return true;
  }

  return false;
}

bool Event::isAfter(DateTime dt) {
  if (time->getYear() > dt.getYear()) {
    return true;
  } else if (time->getYear() == dt.getYear()) {
    if (time->getMonth() > dt.getMonth()) {
      return true;
    } else if (time->getMonth() == dt.getMonth()) {
      if (time->getDay() > dt.getDay()) {
        return true;
      } else if (time->getDay() == dt.getDay()) {
        if (time->getHour() > dt.getHour()) {
          return true;
        } else if (time->getHour() == dt.getHour()) {
          if (time->getMinute() > dt.getMinute()) {
            return true;
          } else if (time->getMinute() == dt.getMinute()) {
            if (time->getSecond() > dt.getSecond()) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

bool Event::isBefore(DateTime dt) {
  if (time->getYear() < dt.getYear()) {
    return true;
  } else if (time->getYear() == dt.getYear()) {
    if (time->getMonth() < dt.getMonth()) {
      return true;
    } else if (time->getMonth() == dt.getMonth()) {
      if (time->getDay() < dt.getDay()) {
        return true;
      } else if (time->getDay() == dt.getDay()) {
        if (time->getHour() < dt.getHour()) {
          return true;
        } else if (time->getHour() == dt.getHour()) {
          if (time->getMinute() < dt.getMinute()) {
            return true;
          } else if (time->getMinute() == dt.getMinute()) {
            if (time->getSecond() < dt.getSecond()) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

bool Event::isDuring(DateTime dt) {
  int eventStart = time->getEpoch();
  int eventEnd = eventStart + duration->getEpoch();
  int dtStart = dt.getEpoch();

  if (dtStart >= eventStart && dtStart < eventEnd) {
    return true;
  }

  return false;
}

string Event::toString() {
  return time->toString() + "\t" + duration->toString() + "\t" + name;
}
