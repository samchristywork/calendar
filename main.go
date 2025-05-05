package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("static")))
	fmt.Println("Serving on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
