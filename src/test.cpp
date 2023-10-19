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

  Event *a = new Event("Foo", new DateTime(2023, 10, 18, 15, 0, 0),
                       new Duration(0, 15, 0));
  Event *b = new Event("2023-12-18 15:30:00	0:30:00	Bar");

  cal.addEvent(a);
  cal.addEvent(b);

  Event *c = cal.findEvent("2023-12-18 15:30:00	0:30:00	Bar");
  assert(c->getName() == "Bar");

  cout << cal.serialize() << endl;

  c->markForDeletion();
  cal.cleanEvents();

  cout << cal.serialize() << endl;

  assert(cal.getEvents().size() == 4);
  assert(cal.getEventsStartingBetween(DateTime(2023, 10, 18, 15, 0, 0),
                                      DateTime(2023, 12, 18, 15, 0, 0))
             .size() == 1);

  cal.writeToFile("/tmp/calendardiff");
}
