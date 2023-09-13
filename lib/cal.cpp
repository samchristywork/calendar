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

class Date {
public:
  Date(string s);
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

string Date::toString() {
  return to_string(year) + "-" + formatFixedWidth(to_string(month), 2, '0') +
         "-" + formatFixedWidth(to_string(day), 2, '0');
}

class Time {
public:
  Time(string s);
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

string Time::toString() {
  return formatFixedWidth(to_string(hour), 2, '0') + ":" +
         formatFixedWidth(to_string(minute), 2, '0') + ":" +
         formatFixedWidth(to_string(second), 2, '0');
}

class DateTime {
public:
  DateTime(string s);
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

string DateTime::toString() {
  return date->toString() + " " + time->toString();
}

class Duration {
public:
  Duration(string s);
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
