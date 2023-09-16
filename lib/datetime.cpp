#include <datetime.h>
#include <util.h>

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
