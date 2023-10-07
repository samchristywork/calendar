#include <datetime.h>
#include <time.h>
#include <util.h>

Duration::Duration(string s) {
  vector<string> tokens = split(s, ':');
  hour = stoi(tokens[0]);
  minute = stoi(tokens[1]);
  second = stoi(tokens[2]);
}

int Duration::getEpoch() { return hour * 60 * 60 + minute * 60 + second; }

string Duration::toString() {
  return to_string(hour) + ":" + formatFixedWidth(to_string(minute), 2, '0') +
         ":" + formatFixedWidth(to_string(second), 2, '0');
}

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

DateTime::DateTime(string s) {
  vector<string> tokens = split(s, ' ');
  date = new Date(tokens[0]);
  time = new Time(tokens[1]);
}

DateTime::DateTime(time_t s) {
  struct tm *t = localtime(&s);
  date = new Date(t->tm_year + 1900, t->tm_mon + 1, t->tm_mday);
  time = new Time(t->tm_hour, t->tm_min, t->tm_sec);
}

void DateTime::delay(Duration d) {
  time->delay(d);
  if (time->getHour() == 0 && time->getMinute() == 0 &&
      time->getSecond() == 0) {
    date->delay(0, 0, 1);
  }
}

int DateTime::getEpoch() {
  struct tm t;
  t.tm_year = date->getYear() - 1900;
  t.tm_mon = date->getMonth() - 1;
  t.tm_mday = date->getDay();
  t.tm_hour = time->getHour();
  t.tm_min = time->getMinute();
  t.tm_sec = time->getSecond();
  t.tm_isdst = -1;
  return mktime(&t);
}

string DateTime::toString() {
  return date->toString() + " " + time->toString();
}
