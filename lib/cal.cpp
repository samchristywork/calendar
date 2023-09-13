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
