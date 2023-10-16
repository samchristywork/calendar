#ifndef datetime
#define datetime

#include <string>

using namespace std;

class Duration {
public:
  Duration() {
    hour = 0;
    minute = 0;
    second = 0;
  }
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
  void setEpoch(int e);
  string toString();

private:
  int hour;
  int minute;
  int second;
};

class Date {
public:
  Date() {
    year = 0;
    month = 0;
    day = 0;
  }
  Date(string s);
  Date(int year, int month, int day) {
    this->year = year;
    this->month = month;
    this->day = day;
  }
  int getYear() { return year; }
  int getMonth() { return month; }
  int getDay() { return day; }
  void setYear(int year) { this->year = year; }
  void setMonth(int month) { this->month = month; }
  void setDay(int day) { this->day = day; }
  void delay(int year, int month, int day);
  string toString();

private:
  int year;
  int month;
  int day;
};

class Time {
public:
  Time() {
    hour = 0;
    minute = 0;
    second = 0;
  }
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
  void setHour(int hour) { this->hour = hour; }
  void setMinute(int minute) { this->minute = minute; }
  void setSecond(int second) { this->second = second; }
  string toString();

private:
  int hour;
  int minute;
  int second;
};

class DateTime {
public:
  DateTime(string s);
  DateTime(time_t s);
  DateTime(int year, int month, int day, int hour, int minute, int second) {
    date.setYear(year);
    date.setMonth(month);
    date.setDay(day);

    time.setHour(hour);
    time.setMinute(minute);
    time.setSecond(second);
  }
  void delay(Duration d);
  int getYear() { return date.getYear(); }
  int getMonth() { return date.getMonth(); }
  int getDay() { return date.getDay(); }
  int getHour() { return time.getHour(); }
  int getMinute() { return time.getMinute(); }
  int getSecond() { return time.getSecond(); }
  void setYear(int year) { date.setYear(year); }
  void setMonth(int month) { date.setMonth(month); }
  void setDay(int day) { date.setDay(day); }
  void setHour(int hour) { time.setHour(hour); }
  void setMinute(int minute) { time.setMinute(minute); }
  void setSecond(int second) { time.setSecond(second); }
  int getEpoch();
  string toString();

private:
  Date date;
  Time time;
};

#endif
