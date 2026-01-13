package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func eventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Could not read request body", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		if !json.Valid(body) {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	} else if r.Method == http.MethodGet {
		data, err := os.ReadFile("data/events.json")
		if err != nil {
			if os.IsNotExist(err) {
				w.Header().Set("Content-Type", "application/json")
				w.Write([]byte("{}"))
				return
			}
			http.Error(w, "Could not read file", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

func main() {
	if err := os.MkdirAll("data", 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Could not create data directory: %v\n", err)
		os.Exit(1)
	}
	http.Handle("/", http.FileServer(http.Dir("static")))
	http.Handle("/events.json", http.HandlerFunc(eventsHandler))
	fmt.Println("Serving on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
