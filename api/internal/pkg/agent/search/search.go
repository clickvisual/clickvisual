package search

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

// isSearchTime 根据时间搜索到数据
// 根据数据匹配，获得后面的时间数据，"ts":"(.*)"
// $1 拿到数据后，按照预设的时间格式解析
// startTime，数据大于他的都符合要求
// endTime，数据小于他的都符合要求
func (c *Component) isSearchByStartTime(value string) bool {
	curTime, indexValue := Index(value, `"ts":"`)
	if indexValue == -1 {
		return false
	}
	curTimeParser := TimeParse(curTime)
	if curTimeParser.Unix() >= c.startTime {
		return true
	}
	return false
}

func (c *Component) isSearchByEndTime(value string) bool {
	curTime, indexValue := Index(value, `"ts":"`)
	if indexValue == -1 {
		return false
	}
	curTimeParser := TimeParse(curTime)
	if curTimeParser.Unix() <= c.endTime {
		return true
	}
	return false
}

func (c *Component) isSearchByKeyWord(value string) bool {
	flag := true
	for _, str := range c.filterWords {
		flag = strings.Contains(value, str) && flag
	}

	return flag
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByStartTime() (int64, error) {
	result := int64(-1)
	from := int64(0)
	to := c.file.size - 1

	const maxCalls = 128
	currCall := 0

	for {
		if from < 0 || from > to || to >= c.file.size {
			return result, nil
		}

		if currCall > maxCalls {
			return -1, errors.New("MAX_CALLS_EXCEEDED")
		}

		// 二分法查找
		strFrom, strTo, err := findString(c.file.ptr, from, to)
		if err != nil {
			return -1, err
		}
		value, err := getString(c.file.ptr, strFrom, strTo)
		if err != nil {
			return -1, err
		}

		isSearch := c.isSearchByStartTime(value)
		// 如果查到了满足条件，继续往上一层查找
		if isSearch {
			// it's already result, but we need to search for more results
			result = strFrom
			to = strFrom - int64(1)
		} else {
			// it's not a result, we need to search for more results
			from = strTo + int64(1)
		}
		currCall++
	}
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByEndTime() (int64, error) {
	result := int64(-1)
	from := int64(0)
	to := c.file.size - 1

	const maxCalls = 128
	currCall := 0

	for {
		if from < 0 || from > to || to >= c.file.size {
			return result, nil
		}

		if currCall > maxCalls {
			return -1, errors.New("MAX_CALLS_EXCEEDED")
		}

		strFrom, strTo, err := findString(c.file.ptr, from, to)
		if err != nil {
			return -1, err
		}
		value, err := getString(c.file.ptr, strFrom, strTo)
		if err != nil {
			return -1, err
		}

		isSearch := c.isSearchByEndTime(value)
		if isSearch {
			// it's already result, but we need to search for more results
			result = strTo
			from = strTo + int64(2) // next byte is \n, so we need to move to the bytes after \n
		} else {
			// it's not a result, we need to search for more results
			to = strFrom - int64(1)
		}
		currCall++
	}
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByWord(startPos, endPos int64) (int64, error) {
	// 游标去掉一部分数据
	_, err := c.file.ptr.Seek(startPos, io.SeekStart)
	if err != nil {
		panic(err)
	}
	i := 0
	// 在读取这个内容
	scanner := bufio.NewScanner(c.file.ptr)
	for scanner.Scan() {
		// 超过位置，直接退出
		if int64(i) > endPos {
			break
		}
		i += len(scanner.Text())
		flag := c.isSearchByKeyWord(scanner.Text())
		if flag {
			str := scanner.Text()
			for _, value := range c.filterWords {
				str = c.bash.ColorWord(value, str)
			}
			fmt.Println(str)
		}
	}
	return 0, nil
}

func (c *Component) parseHitLog(line string) (log map[string]interface{}, err error) {
	if line == "" {
		return nil, errors.New("line is empty")
	}
	log = make(map[string]interface{})
	for _, word := range c.words {
		log[word.Key] = word.Value
	}
	curTime, indexValue := Index(line, `"ts":"`)
	if indexValue != -1 {
		curTimeParser := TimeParse(curTime)
		ts := curTimeParser.Unix()
		if c.request.K8sClientType == cvdocker.ClientTypeContainerd {
			line = getFilterK8SContainerdWrapLog(line)
		}
		log["ts"] = ts
		log[db.TimeFieldNanoseconds] = curTimeParser.Nanosecond()
		log[db.TimeFieldSecond] = ts
	}

	log["body"] = line
	log["_file"] = c.extFile
	c.logs = append(c.logs, log)
	return
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByBackWord(startPos, endPos int64) (logs []map[string]interface{}, error error) {
	// 游标去掉一部分数据
	_, err := c.file.ptr.Seek(startPos, io.SeekStart)
	if err != nil {
		panic(err)
	}
	i := int64(0)
	var (
		str string
	)
	scanner := NewBackScan(c.file.ptr, c.file.size)
	for {
		line, _, err := scanner.Line()
		if err != nil {
			fmt.Println("Error:", err)
			break
		}
		if len(c.filterWords) > 0 {
			flag := c.isSearchByKeyWord(line)
			if flag {
				str = line
				if c.request.IsCommand {
					for _, value := range c.filterWords {
						str = c.bash.ColorWord(value, str)
					}
					if c.request.K8sClientType == cvdocker.ClientTypeContainerd {
						str = getFilterK8SContainerdWrapLog(str)
					}

					c.output = append(c.output, str)
				} else {
					_, err := c.parseHitLog(str)
					if err != nil {
						elog.Error("agent log parse timestamp error", l.E(err))
						continue
					}
				}
				if i == c.limit {
					break
				}
				i++
			}
		} else {
			str = line
			if c.request.IsCommand {
				c.output = append(c.output, str)
			} else {
				_, err := c.parseHitLog(str)
				if err != nil {
					elog.Error("agent log parse timestamp error", l.E(err))
					continue
				}
			}
			if i == c.limit {
				break
			}
			i++
		}

	}
	return c.logs, nil
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByWord2(startPos, endPos int64) (int64, error) {
	var err error
	var cursor = startPos
	buff := make([]byte, 0, 4096)
	char := make([]byte, 1)
	cnt := 0
	// scanner := bufio.NewReader(c.file.ptr.)
	// scanner.ReadString("/n")
	for {
		_, _ = c.file.ptr.Seek(cursor, io.SeekStart)
		_, err = c.file.ptr.Read(char)
		if err != nil {
			panic(err)
		}

		if char[0] == '\n' {
			if len(buff) > 0 {
				// 读取到的行
				flag := c.isSearchByKeyWord(string(buff))
				if flag {
					fmt.Println(string(buff))
				}
				cnt++
				if cnt == 1000000 {
					// 超过数量退出
					break
				}

			}
			buff = buff[:0]
		} else {
			buff = append(buff, char[0])
		}

		if cursor == endPos {
			break
		}
		cursor++
	}
	return 0, nil
}

// min returns minimum of two int64 numbers
func min(a int64, b int64) int64 {
	if a > b {
		return b
	}
	return a
}

// writeBytes writes [start; stop] bytes from fromFile to toFile
func writeBytes(fromFile *os.File, start int64, stop int64, toFile *os.File, maxBufferSize int64) (int64, error) {
	var bytesWritten int64
	bytesWritten = 0
	if start > stop {
		return bytesWritten, nil
	}

	fromFile.Seek(start, 0)
	buffer := make([]byte, min(stop-start+1, maxBufferSize))
	for current := start; current < stop; {
		bufferSize := min(stop-current+1, maxBufferSize)
		if bufferSize < maxBufferSize {
			buffer = make([]byte, bufferSize)
		}

		n, err := fromFile.Read(buffer)
		if err != nil {
			return bytesWritten, err
		} else if int64(n) < bufferSize {
			return bytesWritten, errors.New("Error: unexpected end of input")
		}
		n, err = toFile.Write(buffer)
		if err != nil {
			return bytesWritten, err
		}
		bytesWritten += int64(n)

		current += int64(bufferSize)
	}

	return bytesWritten, nil
}

// newLineIndex returns index of newline symbol in buffer;
// if no newline symbol found returns -1
func newLineIndex(buffer []byte, diff int64) int {
	n := len(buffer)
	if n == 0 {
		return -1
	}

	idx := 0
	if diff == -1 {
		idx = n - 1
	}

	for {
		if n == 0 {
			return -1
		}

		if buffer[idx] == '\n' {
			return idx
		}
		idx = idx + int(diff)
		n--
	}
}

// findBorder searches for newline symbol in [from; to]
// when diff = 1 makes forward search (`from` -> `to`)
// when diff = -1 makes backward search (`to` -> `from`)
func findBorder(file *os.File, from int64, to int64, diff int64, maxBufferSize int64) (int64, error) {
	size := to - from + int64(1)
	currentSize := min(size, maxBufferSize)

	position := from
	if diff == -1 {
		position = to - currentSize + int64(1)
	}
	buffer := make([]byte, currentSize)

	for {
		if size == 0 {
			return -1, nil
		}
		if int64(len(buffer)) != currentSize {
			buffer = make([]byte, currentSize)
		}

		file.Seek(position, 0)

		n, err := file.Read(buffer)
		if err != nil {
			return -1, err
		} else if int64(n) < currentSize {
			return -1, errors.New("Error: unexpected end of input")
		}

		idx := newLineIndex(buffer, diff)
		if idx >= 0 {
			return position + int64(idx), nil
		}

		position = position + diff*currentSize
		size = size - currentSize
		currentSize = min(size, maxBufferSize)
	}
}

// findString searches string borders
// returns (leftBorder, rightBorder, error)
func findString(file *os.File, from int64, to int64) (int64, int64, error) {
	maxBufferSize := int64(64 * 1024)
	middle := (from + to) / 2
	strFrom, err := findBorder(file, from, middle, -1, maxBufferSize)
	if err != nil {
		return -1, -1, err
	} else if strFrom == -1 {
		// no newline found, just return from position
		strFrom = from
	} else {
		// new line found, need to increment position to omit newline byte
		strFrom++
	}
	strTo, err := findBorder(file, middle+1, to, 1, maxBufferSize)
	if err != nil {
		return -1, -1, err
	} else if strTo == -1 {
		// no newline found, just return from position
		strTo = to
	} else {
		// new line found, need to decrement position to omit newline byte
		strTo--
	}
	return strFrom, strTo, nil
}

// getString returns string from `file` in [from; to]
func getString(file *os.File, from int64, to int64) (string, error) {
	bufferSize := to - from + 1
	buffer := make([]byte, bufferSize)

	_, err := file.Seek(from, 0)
	if err != nil {
		return "", err
	}

	_, err = file.Read(buffer)
	if err != nil {
		return "", err
	}

	return string(buffer[:bufferSize]), nil
}

func (c *Component) seekFile() {
	_, err := c.file.ptr.Seek(100, 0)
	if err != nil {
		panic(err)
	}
	scanner := bufio.NewScanner(c.file.ptr)
	for scanner.Scan() {

		fmt.Println(scanner.Text())
	}
}
