#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

string formatFixedWidth(string s, int length, char leftpad) {
  if (s.length() >= length) {
    return s;
  }
  string result = s;
  for (int i = 0; i < length - s.length(); i++) {
    result = leftpad + result;
  }
  return result;
}

std::vector<std::string> split(const std::string &s, char delimiter) {
  std::vector<std::string> tokens;
  std::string token;
  std::istringstream tokenStream(s);

  while (std::getline(tokenStream, token, delimiter)) {
    tokens.push_back(token);
  }

  return tokens;
}

class Duration {
public:
  Duration(string s);
  Duration(int hour, int minute, int second) {
    this->hour = hour;
    this->minute = minute;
    this->second = second;
  }
  int getMinute() { return minute; }
  int getSecond() { return second; }
  int getHour() { return hour; }
  string toString();

private:
  int hour;
  int minute;
  int second;
};

Duration::Duration(string s) {
  vector<string> tokens = split(s, ':');
  hour = stoi(tokens[0]);
  minute = stoi(tokens[1]);
  second = stoi(tokens[2]);
}

string Duration::toString() {
  return to_string(hour) + ":" + formatFixedWidth(to_string(minute), 2, '0') +
         ":" + formatFixedWidth(to_string(second), 2, '0');
}

class Date {
public:
  Date(string s);
  Date(int year, int month, int day) {
    this->year = year;
    this->month = month;
    this->day = day;
  }
  int getYear() { return year; }
  int getMonth() { return month; }
  int getDay() { return day; }
  void delay(int year, int month, int day);
  string toString();

private:
  int year;
  int month;
  int day;
};

Date::Date(string s) {
  vector<string> tokens = split(s, '-');
  year = stoi(tokens[0]);
  month = stoi(tokens[1]);
  day = stoi(tokens[2]);
}

void Date::delay(int year, int month, int day) {
  this->year += year;
  this->month += month;
  this->day += day;

  if (this->day > 31) {
    this->month += this->day / 31;
    this->day = this->day % 31;
  }

  if (this->month > 12) {
    this->year += this->month / 12;
    this->month = this->month % 12;
  }
}

string Date::toString() {
  return to_string(year) + "-" + formatFixedWidth(to_string(month), 2, '0') +
         "-" + formatFixedWidth(to_string(day), 2, '0');
}

class Time {
public:
  Time(string s);
  Time(int hour, int minute, int second) {
    this->hour = hour;
    this->minute = minute;
    this->second = second;
  }
  void delay(Duration d);
  int getHour() { return hour; }
  int getMinute() { return minute; }
  int getSecond() { return second; }
  string toString();

private:
  int hour;
  int minute;
  int second;
};

Time::Time(string s) {
  vector<string> tokens = split(s, ':');
  hour = stoi(tokens[0]);
  minute = stoi(tokens[1]);
  second = stoi(tokens[2]);
}

void Time::delay(Duration d) {
  second += d.getSecond();
  minute += d.getMinute();
  hour += d.getHour();

  if (second >= 60) {
    minute += second / 60;
    second = second % 60;
  }

  if (minute >= 60) {
    hour += minute / 60;
    minute = minute % 60;
  }

  if (hour >= 24) {
    hour = hour % 24;
  }
}

string Time::toString() {
  return formatFixedWidth(to_string(hour), 2, '0') + ":" +
         formatFixedWidth(to_string(minute), 2, '0') + ":" +
         formatFixedWidth(to_string(second), 2, '0');
}

class DateTime {
public:
  DateTime(string s);
  DateTime(int year, int month, int day, int hour, int minute, int second) {
    date = new Date(year, month, day);
    time = new Time(hour, minute, second);
  }
  void delay(Duration d);
  int getYear() { return date->getYear(); }
  int getMonth() { return date->getMonth(); }
  int getDay() { return date->getDay(); }
  int getHour() { return time->getHour(); }
  int getMinute() { return time->getMinute(); }
  int getSecond() { return time->getSecond(); }
  string toString();

private:
  Date *date;
  Time *time;
};

DateTime::DateTime(string s) {
  vector<string> tokens = split(s, ' ');
  date = new Date(tokens[0]);
  time = new Time(tokens[1]);
}

void DateTime::delay(Duration d) {
  time->delay(d);
  if (time->getHour() == 0 && time->getMinute() == 0 &&
      time->getSecond() == 0) {
    date->delay(0, 0, 1);
  }
}

string DateTime::toString() {
  return date->toString() + " " + time->toString();
}

class Event {
public:
  Event(string s);
  Event(string name, DateTime *dt, Duration *d) {
    this->name = name;
    time = dt;
    duration = d;
  }
  void delay(Duration s);
  void setName(string s);
  bool isAfter(DateTime dt);
  bool isBefore(DateTime dt);
  string toString();

private:
  string name;
  DateTime *time;
  Duration *duration;
};

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
