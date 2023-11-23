package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/koustubhmoharir/pathern/patherngo/pathern"
	"github.com/koustubhmoharir/xtn/xtngo/xtn"
)

type rewriteRule struct {
	pattern pathern.PathPattern
	isDir   bool
	target  string
}

func main() {
	configPath := filepath.FromSlash(os.Args[1])
	if !filepath.IsAbs(configPath) {
		configPath, _ = filepath.Abs(configPath)
	}
	configFile, err := os.Open(configPath)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer configFile.Close()

	configBytes, _ := io.ReadAll(configFile)
	var config map[string]interface{}
	xtn.UnmarshalToMap(configBytes, &config)

	dir := filepath.Dir(configPath)
	port := config["port"].(string)
	rewrite, _ := config["rewrite"].([]any)
	rules := make([]rewriteRule, 0, 1)
	for _, r := range rewrite {
		switch r := r.(type) {
		case map[string]any:
			m := r["match"].(string)
			t := r["target"].(string)
			rules = append(rules, rewriteRule{pattern: pathern.New(m), isDir: strings.HasSuffix(m, "/") || m == "", target: t})
		}
	}

	//fileserver := http.FileServer(http.Dir(dir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		isDir := strings.HasSuffix(path, "/") || path == ""
		for _, r := range rules {
			if r.isDir != isDir {
				continue
			}
			m, ok := r.pattern.Match(path)
			if !ok {
				continue
			}
			rp, ok := pathern.Replace(r.target, m)
			if !ok {
				continue
			}
			fmt.Printf("Rewriting %s to %s\n", path, rp)
			path = rp
			break
		}
		fsPath := filepath.Join(dir, strings.TrimPrefix(path, "/"))
		fmt.Printf("Serving %s with %s\n", r.URL.Path, fsPath)
		http.ServeFile(w, r, fsPath)
	})

	fmt.Printf("Starting server at url http://localhost:%v\n", port)
	err = http.ListenAndServe(fmt.Sprintf(":%v", port), nil)
	if err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}
}
