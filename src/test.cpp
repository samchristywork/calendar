#include <cal.h>
#include <cassert>
#include <iostream>
#include <vector>

using namespace std;

int main() {
  Calendar cal;
  cal.readFromFile("res/testFile");

  std::vector<Event *> events = cal.getEvents();

  assert(events.size() == 3);
  assert(events[1]->getName() == "Bar");

  cal.writeToFile("/tmp/calendardiff");
}
