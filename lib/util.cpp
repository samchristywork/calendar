#include <iostream>
#include <sstream>
#include <string>
#include <util.h>

using namespace std;

string formatFixedWidth(string s, unsigned int length, char leftpad) {
  if (s.length() >= length) {
    return s;
  }
  string result = s;
  for (unsigned int i = 0; i < length - s.length(); i++) {
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

void deprecationNotice(string s) {
  cout << "WARNING: " << s << " is deprecated and will be removed in a future "
       << "version of this program." << endl;
}
