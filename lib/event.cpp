#include <event.h>
#include <util.h>
#include <vector>

Event::Event(string s) {
  vector<string> tokens = split(s, '\t');
  name = tokens[0];
  time = new DateTime(tokens[1]);
  duration = new Duration(tokens[2]);
}

void Event::delay(Duration d) { time->delay(d); }

void Event::setName(string s) { name = s; }

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

string Event::toString() {
  return name + "\t" + time->toString() + "\t" + duration->toString();
}
