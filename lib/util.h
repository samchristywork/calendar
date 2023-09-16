#ifndef UTIL_H
#define UTIL_H

#include <string>
#include <vector>

using namespace std;

string formatFixedWidth(string s, int length, char leftpad);

std::vector<std::string> split(const std::string &s, char delimiter);

#endif
