package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

func eventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10 MB limit
		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Could not read request body", http.StatusBadRequest)
			return
		}

		if !json.Valid(body) {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		data := string(body)

		file, err := os.Create(filepath.Join(baseDir, "data", "events.json"))
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
		data, err := os.ReadFile(filepath.Join(baseDir, "data", "events.json"))
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

var baseDir string

func main() {
	baseDir = "."
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		if _, err := os.Stat(filepath.Join(dir, "static")); err == nil {
			baseDir = dir
		}
	}

	defaultPort := "8080"
	if p := os.Getenv("PORT"); p != "" {
		defaultPort = p
	}
	port := flag.String("port", defaultPort, "port to listen on")
	flag.Parse()

	if err := os.MkdirAll(filepath.Join(baseDir, "data"), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Could not create data directory: %v\n", err)
		os.Exit(1)
	}
	http.Handle("/", http.FileServer(http.Dir(filepath.Join(baseDir, "static"))))
	http.Handle("/events.json", http.HandlerFunc(eventsHandler))
	addr := ":" + *port
	fmt.Printf("Serving on http://localhost:%s\n", *port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}
