package search

import (
	"bytes"
	"errors"
	"io"
)

const (
	// DefaultChunkSize is the default value for the ChunkSize option
	DefaultChunkSize = 1024

	// DefaultMaxBufferSize is the default value for the MaxBufferSize option
	DefaultMaxBufferSize = 1 << 20 // 1 MB
)

var (
	// ErrLongLine indicates that the line is longer than the internal buffer size
	ErrLongLine = errors.New("line too long")
)

// Scanner is the back-scanner implementation.
type Scanner struct {
	r   io.ReaderAt // r is the input to read from
	pos int64       // pos is the position of the last read chunk
	o   Options     // o is the Options in effect (options to work with)

	err  error  // err is the encountered error (if any)
	buf  []byte // buf stores the read but not yet returned data
	buf2 []byte // buf2 stores the last buffer to be reused
}

// Options contains parameters that influence the internal working of the Scanner.
type Options struct {
	// ChunkSize specifies the size of the chunk that is read at once from the input.
	ChunkSize int64

	// MaxBufferSize limits the maximum size of the buffer used internally.
	// This also limits the max line size.
	MaxBufferSize int64
}

// New returns a new Scanner.
func NewBackScan(r io.ReaderAt, pos int64) *Scanner {
	return NewOptions(r, pos, nil)
}

// NewOptions returns a new Scanner with the given Options.
// Invalid option values are replaced with their default values.
func NewOptions(r io.ReaderAt, pos int64, o *Options) *Scanner {
	s := &Scanner{r: r, pos: pos}

	if o != nil && o.ChunkSize > 0 {
		s.o.ChunkSize = o.ChunkSize
	} else {
		s.o.ChunkSize = DefaultChunkSize
	}
	if o != nil && o.MaxBufferSize > 0 {
		s.o.MaxBufferSize = o.MaxBufferSize
	} else {
		s.o.MaxBufferSize = DefaultMaxBufferSize
	}

	return s
}

// readMore reads more data from the input.
func (s *Scanner) readMore() {
	if s.pos == 0 {
		s.err = io.EOF
		return
	}
	size := s.o.ChunkSize
	if size > s.pos {
		size = s.pos
	}
	s.pos -= size

	bufSize := size + int64(len(s.buf))
	if bufSize > s.o.MaxBufferSize {
		s.err = ErrLongLine
		return
	}
	if int64(cap(s.buf2)) >= bufSize {
		s.buf2 = s.buf2[:size]
	} else {
		s.buf2 = make([]byte, size, bufSize)
	}

	// ReadAt attempts to read full buff!
	_, s.err = s.r.ReadAt(s.buf2, int64(s.pos))
	if s.err == nil {
		s.buf, s.buf2 = append(s.buf2, s.buf...), s.buf
	}
}

// LineBytes returns the bytes of the next line from the input and its absolute
// byte-position.
// Line ending is cut from the line. Empty lines are also returned.
// After returning the last line (which is the first in the input),
// subsequent calls report io.EOF.
//
// This method is for efficiency if you need to inspect or search in the line.
// The returned line slice shares data with the internal buffer of the Scanner,
// and its content may be overwritten in subsequent calls to LineBytes() or Line().
// If you need to retain the line data, make a copy of it or use the Line() method.
func (s *Scanner) LineBytes() (line []byte, pos int64, err error) {
	if s.err != nil {
		return nil, 0, s.err
	}

	for {
		lineStart := bytes.LastIndexByte(s.buf, '\n')
		if lineStart >= 0 {
			// We have a complete line:
			line, s.buf = dropCR(s.buf[lineStart+1:]), s.buf[:lineStart]
			return line, s.pos + int64(lineStart) + int64(1), nil
		}
		// Need more data:
		s.readMore()
		if s.err != nil {
			if s.err == io.EOF {
				if len(s.buf) > 0 {
					return dropCR(s.buf), 0, nil
				}
			}
			return nil, 0, s.err
		}
	}
}

// Line returns the next line from the input and its absolute byte-position.
// Line ending is cut from the line. Empty lines are also returned.
// After returning the last line (which is the first in the input),
// subsequent calls report io.EOF.
func (s *Scanner) Line() (line string, pos int64, err error) {
	var lineBytes []byte
	lineBytes, pos, err = s.LineBytes()
	line = string(lineBytes)
	return
}

// dropCR drops a terminal \r from the data.
func dropCR(data []byte) []byte {
	if len(data) > 0 && data[len(data)-1] == '\r' {
		return data[0 : len(data)-1]
	}
	return data
}
