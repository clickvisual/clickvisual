package search

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/panjf2000/ants"

	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
)

var (
	pool *ants.Pool
	wg   sync.WaitGroup
)

func init() {
	p, err := ants.NewPool(10, ants.WithOptions(ants.Options{
		ExpiryDuration:   time.Minute,
		MaxBlockingTasks: 30,
	}))

	if err != nil {
		panic("local search ants pool init error")
	}
	pool = p
}

type OffsetSection struct {
	endPos int64
	offset int64
	count  int64
}

func (offset *OffsetSection) isValid(pos int64) bool {
	return offset.endPos >= pos
}

func (offset *OffsetSection) clear() {
	offset.offset = -1
	offset.endPos = -1
	offset.count = 0
}

func (offset *OffsetSection) incr() {
	offset.count++
}

func (offset *OffsetSection) load(newOffset, newEndPos int64) {
	offset.offset = newOffset
	offset.endPos = newEndPos
	offset.count = 0
}

// isSearchTime 根据时间搜索到数据
// 根据数据匹配，获得后面的时间数据，"ts":"(.*)"
// $1 拿到数据后，按照预设的时间格式解析
// startTime，数据大于他的都符合要求
// endTime，数据小于他的都符合要求
func (c *Component) isSearchByStartTime(value string) bool {
	curTime, indexValue := utils.IndexParse(value)
	if indexValue == -1 {
		return false
	}
	curTimeParser := utils.TimeParse(curTime)
	if curTimeParser.Unix() >= c.startTime {
		return true
	}
	return false
}

func isSearchByEndTime(value string, endTime int64) bool {
	curTime, indexValue := utils.IndexParse(value)
	if indexValue == -1 {
		return false
	}
	curTimeParser := utils.TimeParse(curTime)
	if curTimeParser.Unix() <= endTime {
		return true
	}
	return false
}

func (c *Component) isSearchByKeyWord(value string) bool {
	flag := true
	// 每个 filtersWord 匹配 string 和 int 两种情况
	for _, filterStr := range c.filterWords {
		filterInt := strings.TrimSuffix(filterStr, `"`)
		filterInt = strings.Replace(filterInt, `":"`, `":`, 1)
		// 匹配其中一个即可
		flag = (strings.Contains(value, filterStr) || strings.Contains(value, filterInt)) && flag
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

		isSearch := isSearchByEndTime(value, c.endTime)
		if isSearch {
			// it's already result, but we need to search for more results
			result = strTo
			from = strTo + int64(2) // next byte is \n, so we need to move to the bytes after \n
		} else {
			// it's not a result, we need to search for more results
			to = strFrom - int64(1)
		}
		currCall++
		// from ----------middle-------E-------- To
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

func (c *Component) searchLogs(startPos, endPos, remainedLines int64) (int64, error) {
	_, err := c.file.ptr.Seek(startPos, io.SeekStart)
	if err != nil {
		panic(err)
	}

	ep := endPos
	now := ep

	// need read from end ----> start
	var (
		basicSize  int64  = c.partitionSize
		fileReader []byte = make([]byte, basicSize)
		before     []byte = make([]byte, 0)
		data              = make([]byte, 0)
		limit             = remainedLines
	)

	includeFileEnd := now == c.file.size-1 || now == c.file.size-2

	for {
		readStartPos := now - basicSize
		if readStartPos <= 0 {
			readStartPos = 0
		}
		c.file.ptr.Seek(readStartPos, 0)
		now -= basicSize
		c.file.ptr.Read(fileReader)

		if readStartPos == 0 {
			fileReader = fileReader[:now]
		}

		data = append(data, fileReader...)

		// '\n' in the last line will be ingored, so need to append it
		if includeFileEnd {
			data = append(data, '\n')
			includeFileEnd = false
		}

		limit, before = c.doGetLogs(data, before, limit)
		data = data[0:0]

		if limit == 0 || now <= 0 {
			break
		}
	}
	return limit, nil
}

func (c *Component) getLogs(startPos, endPos int64) (error error) {
	partitions := c.calcPartitionInterval(2, startPos, endPos)
	remainedLines := c.limit

	// logs need the latest record, so need to search from the end side
	for i := 1; i >= 0; i-- {
		// fmt.Println("partitions: ", partitions[i][0], partitions[i][1])
		lines, err := c.searchLogs(partitions[i][0], partitions[i][1], remainedLines)
		// fmt.Println("lines: ", lines)
		if err != nil {
			return err
		}
		if lines == 0 {
			break
		}
		remainedLines = lines
	}

	if c.request.IsCommand {
		var str string
		output := make([]string, len(c.output))
		for i, value := range c.output {
			str = value
			for _, filter := range c.filterWords {
				str = c.bash.ColorWord(filter, str)
			}
			output[i] = str
		}
		c.output = output
	}
	return nil
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func (c *Component) searchByBackWord(startPos, endPos int64) (error error) {
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
				}
				c.output = append(c.output, str)
				if i == c.limit {
					break
				}
				i++
			}
		} else {
			c.output = append(c.output, line)
			if i == c.limit {
				break
			}
			i++
		}

	}
	return nil
}

func (c *Component) searchCharts(startPos, endPos int64) (error error) {
	var wg sync.WaitGroup
	wg.Add(c.partitionNum)
	partitions := c.calcPartitionInterval(c.partitionNum, startPos, endPos)

	task := func(start, end int64) func() {
		return func() {
			defer wg.Done()
			c.calcLogsLine(start, end)
			// fmt.Printf("%s goroutine -> lines: %d\n", c.file.path, lines)
		}
	}

	for i, _ := range partitions {
		// fmt.Println(partitions[i][0], partitions[i][1])
		err := pool.Submit(task(partitions[i][0], partitions[i][1]))
		if err != nil {
			// fmt.Println("submut partition successful")
		}
	}
	wg.Wait()
	return nil
}

func (c *Component) calcLogsLine(startPos, endPos int64) int64 {
	sp := startPos
	ep := endPos
	now := sp

	var (
		basicSize  int64 = c.partitionSize
		total      int64
		lines      int64
		fileReader []byte = make([]byte, basicSize)
		before     []byte = make([]byte, 0)
		data              = make([]byte, 0)
		section           = OffsetSection{
			offset: -1,
			endPos: -1,
			count:  0,
		}
		file *File
	)

	// seek operation is not safe in the concurrent env, so need to open a new ptr
	f, err := OpenFile(c.file.path)
	if err != nil {
		panic("error")
	}
	file = f
	defer file.ptr.Close()
	for {
		file.ptr.Seek(now, 0)
		bl, _ := file.ptr.Read(fileReader)
		bytesLen := int64(bl)

		if ep-now <= basicSize {
			fileReader = fileReader[:ep-now+1]
			fileReader[ep-now] = '\n'
		}

		data = append(data, fileReader...)

		lines, before = c.doCalcLines(file, data, before, now, &section)
		total += lines
		now += bytesLen

		data = data[0:0]
		if now >= endPos {
			break
		}
	}
	c.recordCharts(section)
	return total
}

func (c *Component) calcPartitionInterval(n int, start, end int64) [][2]int64 {
	var resp [][2]int64
	switch {
	case n == 1:
		resp = append(resp, [2]int64{start, end})
		break
	case n == 2:
		from, _, err := findString(c.file.ptr, start, end)
		if err != nil {
			panic(err)
		}
		resp = append(resp, [2]int64{start, from - 2}, [2]int64{from, end})
		break
	case n == 3:
		leftFrom, _, err := findString(c.file.ptr, start, (end*2)/3)
		if err != nil {
			panic(err)
		}

		rightFrom, _, err := findString(c.file.ptr, leftFrom, end)
		if err != nil {
			panic(err)
		}
		resp = append(resp, [2]int64{start, leftFrom - 2}, [2]int64{leftFrom, rightFrom - 2}, [2]int64{rightFrom, end})
		break
	case n == 4:
		middleFrom, _, err := findString(c.file.ptr, start, end)
		if err != nil {
			panic(err)
		}

		leftFrom, _, err := findString(c.file.ptr, start, middleFrom-2)
		if err != nil {
			panic(err)
		}

		rightFrom, _, err := findString(c.file.ptr, middleFrom, end)
		if err != nil {
			panic(err)
		}
		resp = append(resp, [2]int64{start, leftFrom - 2}, [2]int64{leftFrom, middleFrom - 2}, [2]int64{middleFrom, rightFrom - 2}, [2]int64{rightFrom, end})
	default:
		panic("error")
	}
	return resp
}

func (c *Component) doGetLogs(data []byte, tailLine []byte, limit int64) (lines int64, beforeLine []byte) {
	var (
		br1            int = -1
		br2            int = -1
		ok             bool
		hasFilterWords = len(c.filterWords) > 0
	)

	if len(beforeLine) > 0 {
		data = append(data, beforeLine...)
	}

	if data[0] == '\n' {
		beforeLine = append(beforeLine, '\n')
		data = data[1:]
	} else {
		firstLinePos := bytes.Index(data, []byte{'\n'})
		if firstLinePos != -1 {
			beforeLine = append(beforeLine, bytes.Clone(data[:firstLinePos+1])...)
		} else {
			beforeLine = append(beforeLine, bytes.Clone(data)...)
			return lines, beforeLine
		}
		data = data[firstLinePos+1:]
	}

	br1 = bytes.LastIndexByte(data, '\n')
	br2 = bytes.LastIndexByte(data[:br1], '\n')

	if br2 == -1 {
		_, ok, _ = c.verifyKeyWords(data[:br1], c.filterWords, br1, nil)
		if ok {
			c.output = append(c.output, string(data[:br1]))
			limit--
		}
		return limit, tailLine
	}

	for br2 != -1 {
		flag := true
		if hasFilterWords {
			for _, v := range c.filterWords {
				p := bytes.LastIndex(data[:br1], []byte(v))
				if p == -1 {
					return limit, tailLine
				}

				if p <= br2 {
					flag = false
					for p <= br2 {
						br1 = br2
						pos := bytes.LastIndexByte(data[:br2], '\n')
						if p == -1 {
							// 找到第一行了
							_, ok, _ = c.verifyKeyWords(data[:br1], c.filterWords, br1, nil)
							if ok {
								c.output = append(c.output, string(data[:br1]))
								limit--
								if limit <= 0 {
									return limit, nil
								}
							}
							return limit, tailLine
						} else {
							br2 = pos
						}
					}
				}
			}
		}

		if flag {
			c.output = append(c.output, string(data[br2+1:br1]))
			limit--
			if limit <= 0 {
				return limit, nil
			}

			data = data[:br2]
			br1 = br2
			br2 = bytes.LastIndexByte(data, '\n')
			if br2 == -1 {
				_, ok, _ = c.verifyKeyWords(data[:br1], c.filterWords, br1, nil)
				if ok {
					c.output = append(c.output, string(data[:br1]))
					limit--
				}
				return limit, tailLine
			}
		}
	}
	return limit, tailLine
}

func (c *Component) doCalcLines(file *File, data []byte, before []byte, startPos int64, section *OffsetSection) (lines int64, tailLine []byte) {
	var (
		pos            int = -1
		ok             bool
		filterPosMap   map[string]int = make(map[string]int)
		emptyPos       bool           = true
		skipTag        int            = -1
		offset                        = int64(0)
		firstLine      []byte
		hasFilterWords = len(c.filterWords) > 0
	)

	pos = bytes.Index(data, []byte{'\n'})
	if pos == -1 {
		if hasFilterWords && len(before) > 0 {
			tailLine = append(tailLine, bytes.Clone(data)...)
		}
		return 0, tailLine
	} else {
		firstLine = append(firstLine, before...)
		firstLinesBuf := data[:pos]
		firstLine = append(firstLine, firstLinesBuf...)
		ok = true
		if hasFilterWords {
			_, ok, _ = c.verifyKeyWords(firstLine, c.filterWords, -1, filterPosMap)
		}

		if !section.isValid(startPos) {
			if section.offset != -1 {
				c.recordCharts(*section)
				section.clear()
			}
			c.calcOffsetSectionPos(file, data, section, startPos, pos)
		}
		if ok {
			lines++
			section.incr()
		}
		startPos += int64(pos)
		data, _, pos = goingOn(data, -1, pos, filterPosMap)
	}

	lastPos := bytes.LastIndex(data, []byte{'\n'})
	if lastPos == -1 {
		tailLine = append(tailLine, bytes.Clone(data)...)
		return lines, tailLine
	} else {
		tailLine = append(tailLine, bytes.Clone(data[lastPos+1:])...)
	}

	for pos != -1 {
		skipTag = -1
		flag := true
		if hasFilterWords {
			for _, v := range c.filterWords {
				if !emptyPos {
					p, ok := filterPosMap[v]
					if ok {
						if p >= pos {
							skipTag = p
							data, skipTag, pos, offset = skipLines(data, skipTag, pos, filterPosMap)
							startPos += offset
							if pos == -1 {
								return lines, tailLine
							}
							flag = false
							break
						}
						continue
					}
				}

				p, ok := c.verifyKeyWord(data, v, pos)

				// 若读取的没有找到，说明这段数据中不可能存在匹配的日志
				// 此时需要找到末尾的 \n 重新匹配
				if !ok {
					if p == -1 {
						return lines, tailLine
					}
					data, skipTag, pos, offset = skipLines(data, p, pos, filterPosMap)
					startPos += offset
					if pos == -1 {
						return lines, tailLine
					}
					flag = false
				}
			}
		}

		if flag {
			if !section.isValid(startPos) {
				if section.offset != -1 {
					c.recordCharts(*section)
					section.clear()
				}
				c.calcOffsetSectionPos(file, data, section, startPos, pos)
			}
			lines++
			section.incr()
			startPos += int64(pos)
			data, _, pos = goingOn(data, skipTag, pos, filterPosMap)
		}

		if hasFilterWords {
			skipTag, _, emptyPos = c.verifyKeyWords(data, c.filterWords, pos, filterPosMap)
		}
	}
	return lines, tailLine
}

func (c *Component) calcOffsetSectionPos(file *File, data []byte, offsetSection *OffsetSection, startPos int64, pos int) {
	line := data[:pos]
	curTime, timeIndex := utils.IndexParse(string(line))
	if timeIndex == -1 {
		return
	}
	unixTime := utils.TimeParse(curTime).Unix()
	offset := (unixTime - c.startTime) / c.interval
	endTime := c.startTime + (offset+1)*c.interval

	result := int64(-1)
	from := startPos + int64(pos+1)
	to := file.size - 1

	for {
		if from < 0 || from > to || to >= c.file.size {
			break
		}

		strFrom, strTo, err := findString(file.ptr, from, to)
		if err != nil {
			panic(err)
		}

		value, err := getString(file.ptr, strFrom, strTo)
		if err != nil {
			panic(err)
		}

		isSearch := isSearchByEndTime(value, endTime)
		if isSearch {
			// it's already result, but we need to search for more results
			result = strTo
			from = strTo + int64(2) // next byte is \n, so we need to move to the bytes after \n
		} else {
			// it's not a result, we need to search for more results
			to = strFrom - int64(1)
		}
		// from ----------middle-------E-------- To
	}

	if result != -1 {
		offsetSection.load(offset, result)
		return
	}
	panic("file search calcOffsetSectionPos error")
}

func skipLines(data []byte, skipTag, pos int, filterPosMap map[string]int) ([]byte, int, int, int64) {
	offset := int64(0)
	for skipTag > pos {
		offset += int64(pos)
		data, skipTag, pos = goingOn(data, skipTag, pos, filterPosMap)
		if pos == -1 {
			return data, skipTag, pos, offset
		}
	}
	return data, skipTag, pos, offset
}

func goingOn(data []byte, skipTag, pos int, filterPosMap map[string]int) ([]byte, int, int) {
	skipTag -= pos + 1
	if skipTag <= 0 {
		skipTag = -1
	}
	// 更新 pos map
	for k, v := range filterPosMap {
		if v < pos+1 {
			delete(filterPosMap, k)
		} else {
			filterPosMap[k] -= pos + 1
		}
	}
	data = data[pos+1:]
	pos = bytes.Index(data, []byte{'\n'})
	return data, skipTag, pos
}

func (c *Component) recordCharts(section OffsetSection) {
	if section.offset < 0 && section.count < 0 {
		return
	}
	c.mu.Lock()
	c.charts[section.offset] += section.count
	c.mu.Unlock()
}

func (c *Component) verifyKeyWords(data []byte, filter []string, pos int, filterWordsMap map[string]int) (int, bool, bool) {
	var (
		ok       = true
		emptyPos = true
		skipTag  = -1
	)
	for _, v := range filter {
		p := bytes.Index(data, []byte(v))
		if p == -1 {
			ok = false
		} else {
			if filterWordsMap != nil {
				filterWordsMap[v] = p
				emptyPos = false
			}
			if pos != -1 && p > pos {
				ok = false
				if p > skipTag {
					skipTag = p
				}
			}
		}
	}

	return skipTag, ok, emptyPos
}

func (c *Component) verifyKeyWord(data []byte, filter string, pos int) (int, bool) {
	p := bytes.Index(data, []byte(filter))
	return p, p != -1 && p < pos
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
	maxBufferSize := int64(60 * 1024)
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

	// fmt.Printf("####getString from: %d, to: %d, str : %s####\n", from, to, string(buffer[:bufferSize]))
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
