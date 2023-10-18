CC=g++
CFLAGS=-Wall -Wextra -pedantic -std=c++11 -I./src/ -I ./lib/

all: build/main

build/%.o: lib/%.cpp
	mkdir -p build
	$(CC) -c $(CFLAGS) $< -o $@

build/%.o: src/%.cpp
	mkdir -p build
	$(CC) -c $(CFLAGS) $< -o $@

build/main: build/main.o build/event.o build/util.o build/datetime.o build/cal.o
	${CC} build/*.o ${LIBS} -o $@

build/test: build/test.o build/event.o build/util.o build/datetime.o build/cal.o
	${CC} build/*.o ${LIBS} -o $@

.PHONY: run
run: build/main
	./build/main

.PHONY: test
test: build/test
	./build/test

.PHONY: clean
clean:
	rm -rf build
