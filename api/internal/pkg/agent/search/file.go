package search

import (
	"os"
)

// File contains file related information
type File struct {
	ptr  *os.File
	size int64
	path string
}

func OpenFile(filename string) (*File, error) {
	file, err := os.Open(filename)
	if err != nil {
		return &File{}, err
	}

	fi, err := file.Stat()
	if err != nil {
		file.Close()
		return &File{}, err
	}
	size := fi.Size()

	return &File{
		ptr:  file,
		path: filename,
		size: size,
	}, nil
}
