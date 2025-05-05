package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

func eventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Could not read request body", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		data := string(body)

		file, err := os.Create("data/events.json")
		if err != nil {
			http.Error(w, "Could not create file", http.StatusInternalServerError)
			return
		}
		defer file.Close()
		_, err = file.WriteString(data)
		if err != nil {
			http.Error(w, "Could not write to file", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Data saved successfully"))
	} else if r.Method == http.MethodGet {
		file, err := os.Open("data/events.json")
		if err != nil {
			http.Error(w, "Could not open file", http.StatusInternalServerError)
			return
		}
		defer file.Close()
		data, err := ioutil.ReadAll(file)
		if err != nil {
			http.Error(w, "Could not read file", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(data)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

func main() {
	http.Handle("/", http.FileServer(http.Dir("static")))
	http.Handle("/events.json", http.HandlerFunc(eventsHandler))
	fmt.Println("Serving on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
