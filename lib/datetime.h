#ifndef datetime
#define datetime

#include <string>

using namespace std;

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
  int getEpoch();
  string toString();

private:
  int hour;
  int minute;
  int second;
};

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

class DateTime {
public:
  DateTime(string s);
  DateTime(int s);
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
  int getEpoch();
  string toString();

private:
  Date *date;
  Time *time;
};

#endif
