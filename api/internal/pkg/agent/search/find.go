package search

import (
	"os"
	"path/filepath"
)

func findFiles(searchDir string) []string {
	var arr []string
	filepath.Walk(searchDir, func(path string, file os.FileInfo, _ error) error {
		// 如果是目录需要过滤
		if file.IsDir() {
			return nil
		}
		// todo 过滤后缀名，过滤路径
		arr = append(arr, path)
		return nil
	})

	return arr
}
