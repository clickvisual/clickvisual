package search

import (
	"bytes"
	"errors"
	"io"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
	"github.com/panjf2000/ants"

	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
)

var (
	pool *ants.Pool
)

func init() {
	// The scanned files will be searched for fragments and occupy memory based on the read buffer size.
	// If the number of files is too large, OOM risks may occur.
	// The goroutine pool is used to limit the number of goroutine
	p, err := ants.NewPool(10, ants.WithOptions(ants.Options{
		ExpiryDuration:   time.Minute,
		MaxBlockingTasks: 30,
	}))

	if err != nil {
		panic("local search ants pool init error")
	}
	pool = p
}

// This structure is mainly used to record the maximum pos belonging to the same offset when searching,
// and the number of rows that have been searched for a match
type OffsetSection struct {
	endPos int64
	offset int64
	count  int64
}

func (offset *OffsetSection) isValid(pos int64) bool {
	return offset.offset >= 0 && (offset.endPos >= pos || offset.endPos == -1)
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
func isSearchByStartTime(value string, startTime int64) int {
	curTime, indexValue := utils.IndexParseTime(value)
	if indexValue == -1 {
		return -1
	}
	if curTime >= startTime {
		return 1
	}
	return 0
}

func isSearchByEndTime(value string, endTime int64) int {
	curTime, indexValue := utils.IndexParseTime(value)
	if indexValue == -1 {
		return -1
	}
	if curTime <= endTime {
		return 1
	}
	return 0
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
func searchByStartTime(file *File, startTime int64) (int64, error) {
	result := int64(-1)
	from := int64(0)
	to := file.size - 1

	const maxCalls = 128
	currCall := 0
	ok := true
	nextStartPos := int64(0)
	for {
		if from < 0 || from > to || to >= file.size {
			return result, nil
		}

		if currCall > maxCalls {
			return -1, errors.New("MAX_CALLS_EXCEEDED")
		}

		var strFrom, strTo int64
		var err error
		// 二分法查找
		if ok {
			strFrom, strTo, err = findString(file.ptr, from, to)
		} else {
			strFrom, strTo, err = findNextString(file, nextStartPos)
		}
		if err != nil {
			return -1, err
		}
		nextStartPos = strTo
		ok = true
		value, err := getString(file.ptr, strFrom, strTo)
		if err != nil {
			return -1, err
		}

		isSearch := isSearchByStartTime(value, startTime)
		// 如果查到了满足条件，继续往上一层查找
		if isSearch == 1 {
			// it's already result, but we need to search for more results
			result = strFrom
			to = strFrom - int64(1)
		} else if isSearch == 0 {
			// it's not a result, we need to search for more results
			from = strTo + int64(2)
		} else {
			ok = false
		}
		currCall++
	}
}

// search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
// because of not all log is format, so maybe verify it lead to ret -1
func searchByEndTime(file *File, from, endTime int64) (int64, error) {
	result := int64(-1)
	to := file.size - 1

	const maxCalls = 128
	currCall := 0
	ok := true
	nextStartPos := int64(0)

	for {
		if from < 0 || from > to || to >= file.size {
			return result, nil
		}

		if currCall > maxCalls {
			return -1, errors.New("MAX_CALLS_EXCEEDED")
		}

		var strFrom, strTo int64
		var err error
		// 二分法查找
		if ok {
			strFrom, strTo, err = findString(file.ptr, from, to)
		} else {
			strFrom, strTo, err = findNextString(file, nextStartPos)
		}
		if err != nil {
			return -1, err
		}

		nextStartPos = strTo
		ok = true
		value, err := getString(file.ptr, strFrom, strTo)
		if err != nil {
			return -1, err
		}

		isSearch := isSearchByEndTime(value, endTime)
		if isSearch == 1 {
			// it's already result, but we need to search for more results
			result = strTo
			from = strTo + int64(2) // next byte is \n, so we need to move to the bytes after \n
		} else if isSearch == 0 {
			// it's not a result, we need to search for more results
			to = strFrom - int64(1)
		} else {
			ok = false
		}
		currCall++
		// from ----------middle-------E-------- To
	}
}

func findNextString(file *File, to int64) (int64, int64, error) {
	bufSize := int64(60 * 1024)
	buf := make([]byte, bufSize)
	pos := -1
	h := to + 2
	for pos == -1 {
		_, err := file.ptr.Seek(h, 0)
		if err != nil {
			return -1, -1, err
		}
		_, err = file.ptr.Read(buf)
		if err != nil {
			return -1, -1, err
		}
		pos = bytes.IndexByte(buf, '\n')
		h += bufSize
		if pos != -1 && h > file.size {
			return -1, -1, errors.New("Cannot Found Line")
		}
	}

	h -= bufSize
	return to + 2, h + int64(pos), nil
}

func (c *Component) searchLogs(startPos, endPos, remainedLines int64) (int64, error) {
	defer func() {
		if err := recover(); err != nil {
			stack := make([]byte, 4096)
			stack = stack[:runtime.Stack(stack, true)]
			elog.Error("agent search logs panic",
				l.S("file", c.file.path),
				l.I64("pos", startPos),
				elog.Any("stack", stack),
				elog.FieldErr(err.(error)))
		}
	}()

	_, err := c.file.ptr.Seek(startPos, io.SeekStart)
	if err != nil {
		elog.Error("agent getlogs file seek error", elog.String("file", c.file.path), elog.FieldErr(err))
		return 0, err
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

	// '\n' in the last line will be ignored, so need to check and append it
	includeFileEnd := now == c.file.size-1 || now == c.file.size-2
	includeFirstLine := startPos == 0

	for {
		readStartPos := now - basicSize
		if readStartPos <= 0 {
			readStartPos = 0
		}
		_, _ = c.file.ptr.Seek(readStartPos, 0)
		_, _ = c.file.ptr.Read(fileReader)

		if readStartPos <= 0 {
			fileReader = fileReader[:now]
			if includeFirstLine && readStartPos == 0 {
				fileReader = append([]byte("\n"), fileReader...)
			}
		}

		now -= basicSize

		data = append(data, fileReader...)

		// '\n' in the last line will be ignored, so need to append it
		if includeFileEnd {
			data = append(data, '\n')
			includeFileEnd = false
		}

		limit, before = c.doGetLogs(data, before, limit)

		// clear data for next turn
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
		lines, err := c.searchLogs(partitions[i][0], partitions[i][1], remainedLines)
		if err != nil {
			elog.Error("agent getlogs error", elog.FieldErr(err))
			return err
		}
		if lines == 0 {
			break
		}
		remainedLines = lines
	}

	if c.request.IsCommand {
		var str string
		c.commandOutput = make([]string, len(c.output))
		for _, value := range c.output {
			str = value
			for _, val := range c.customSearches {
				str = c.bash.ColorWord(val.Filter, str)
			}
			c.commandOutput = append(c.commandOutput, str)
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
		}
	}

	for i := range partitions {
		err := pool.Submit(task(partitions[i][0], partitions[i][1]))
		if err != nil {
			elog.Error("ants pool submit error", elog.FieldErr(err))
			return err
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

	// seek operation is not safe in the concurrent env, so need to create a new ptr
	f, err := OpenFile(c.file.path)
	if err != nil {
		elog.Error("search charts failed", elog.String("file", c.file.path), elog.FieldErr(err))
		panic(err)
	}
	file = f
	file.size = c.file.size

	defer file.ptr.Close()
	for {
		_, _ = file.ptr.Seek(now, 0)
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
	// the last section need to record
	c.recordCharts(section)
	return total
}

// calcPartitionInterval divide the file into n partitions
// TODO: use search cache
func (c *Component) calcPartitionInterval(n int, start, end int64) [][2]int64 {
	var resp [][2]int64

	errWrapper := func(err error) {
		if err != nil {
			elog.Panic("agent search calcPartitionInterval findString failed", elog.String("file", c.file.path), elog.FieldErr(err))
		}
	}
	switch {
	case n == 1:
		resp = append(resp, [2]int64{start, end})
	// 目前只用到2
	case n == 2:
		from, _, err := findString(c.file.ptr, start, end)
		errWrapper(err)
		resp = append(resp, [2]int64{start, from - 2}, [2]int64{from, end})
	case n == 3:
		leftFrom, _, err := findString(c.file.ptr, start, (end*2)/3)
		errWrapper(err)

		rightFrom, _, err := findString(c.file.ptr, leftFrom, end)
		errWrapper(err)
		resp = append(resp, [2]int64{start, leftFrom - 2}, [2]int64{leftFrom, rightFrom - 2}, [2]int64{rightFrom, end})
	case n == 4:
		middleFrom, _, err := findString(c.file.ptr, start, end)
		errWrapper(err)

		leftFrom, _, err := findString(c.file.ptr, start, middleFrom-2)
		errWrapper(err)

		rightFrom, _, err := findString(c.file.ptr, middleFrom, end)
		errWrapper(err)
		resp = append(resp, [2]int64{start, leftFrom - 2}, [2]int64{leftFrom, middleFrom - 2}, [2]int64{middleFrom, rightFrom - 2}, [2]int64{rightFrom, end})
	default:
		panic("invalid partition number, need to support in `calcPartitionInterval`")
	}
	return resp
}

// doGetLogs search from the tail to head
func (c *Component) doGetLogs(data []byte, tailLine []byte, limit int64) (lines int64, beforeLine []byte) {
	//		   br2        br1
	// {xxxxxx}\n{xxxxxxx}\n{xxxxxx}
	var (
		br1            int
		br2            int
		ok             bool
		hasFilterWords = len(c.customSearches) > 0
	)

	if len(beforeLine) > 0 {
		data = append(data, beforeLine...)
	}

	// keep \n to next turn
	if data[0] == '\n' {
		beforeLine = append(beforeLine, '\n')
		data = data[1:]
	} else {
		firstLinePos := bytes.Index(data, []byte{'\n'})

		// must clone, because data may be changed in the outside
		if firstLinePos != -1 {
			beforeLine = append(beforeLine, bytes.Clone(data[:firstLinePos+1])...)
		} else {
			beforeLine = append(beforeLine, bytes.Clone(data)...)
			return lines, beforeLine
		}
		data = data[firstLinePos+1:]
	}

	br1 = bytes.LastIndexByte(data, '\n')

	if br1 == -1 {
		beforeLine = append(beforeLine, bytes.Clone(data)...)
		return lines, beforeLine
	}

	br2 = bytes.LastIndexByte(data[:br1], '\n')

	// means there is the first line
	if br2 == -1 {
		_, ok, _ = c.verifyKeyWords(data[:br1], c.customSearches, br1, nil)
		if ok {
			c.output = append(c.output, string(data[:br1]))
			limit--
		}
		return limit, beforeLine
	}

	for br2 != -1 {
		flag := true
		if hasFilterWords {
			for _, v := range c.customSearches {
				//p := bytes.LastIndex(data[:br1], []byte(v.Filter))
				var p int
				if v.Operate == KeySearchOperateEqual {
					p = bytes.Index(data, []byte(v.Filter))
				} else if v.Operate == KeySearchOperateLT {
					// "cost":172.34,
					p = ltAndGt(data, v, true)
				} else if v.Operate == KeySearchOperateGT {
					p = ltAndGt(data, v, false)
				}
				if p == -1 {
					return limit, beforeLine
				}

				// valid br2 *****p***** br1
				// invalid 	 ***p*** br2 ******** br1, need to skip lines
				if p <= br2 {
					flag = false
					// skip lines
					for p <= br2 {
						br1 = br2
						pos := bytes.LastIndexByte(data[:br2], '\n')
						// means there is the first line
						if p == -1 {
							_, ok, _ = c.verifyKeyWords(data[:br1], c.customSearches, br1, nil)
							if ok {
								c.output = append(c.output, string(data[:br1]))
								limit--
								if limit <= 0 {
									return limit, nil
								}
							}
							return limit, beforeLine
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
				_, ok, _ = c.verifyKeyWords(data[:br1], c.customSearches, br1, nil)
				if ok {
					c.output = append(c.output, string(data[:br1]))
					limit--
					if limit <= 0 {
						return limit, nil
					}
				}
				return limit, beforeLine
			}
		}
	}
	return limit, beforeLine
}

// doCalcLines calc match log lines
// startPos: help to calc the line pos in the file
// section: record the offset 、lines
func (c *Component) doCalcLines(file *File, data []byte, before []byte, startPos int64, section *OffsetSection) (lines int64, tailLine []byte) {
	var (
		pos            int
		ok             bool
		filterPosMap   = make(map[string]int)
		emptyPos       = true
		skipTag        int
		offset         int64
		firstLine      []byte
		hasFilterWords = len(c.customSearches) > 0
	)

	// Because it is a forward search, 'before' is the incomplete row of data at the end of the last round of search.
	// In this case, the data needs to be concatenated to the beginning of the current data.
	// To avoid the overhead of frequent expansion of slice, the first row is separately searched instead of concatenated
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
			_, ok, _ = c.verifyKeyWords(firstLine, c.customSearches, -1, filterPosMap)
		}

		var err error
		if !section.isValid(startPos) {
			if section.offset != -1 {
				c.recordCharts(*section)
				section.clear()
			}
			// If this row of logs matches,
			// the start time of this row of logs is used to find the largest timestamp pos belonging to the same offset.
			// If it is found later, there is no need to parse it again for calculation as long as it is less than this pos
			err = c.calcOffsetSectionPos(file, data, section, startPos, pos)
		}
		if err == nil && ok {
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
		data = data[:lastPos+1]
	}

	for pos != -1 {
		skipTag = -1
		flag := true
		if hasFilterWords {
			for _, v := range c.customSearches {
				if !emptyPos {
					p, ok := filterPosMap[v.Filter]
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

				p, ok := c.verifyKeyWord(data, v.Filter, pos)

				// If the read is not found, it indicates that no matching log exists in the data
				// At this point, just need to find the \n at the end to rematch
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
			var err error
			if !section.isValid(startPos) {
				if section.offset != -1 {
					c.recordCharts(*section)
					section.clear()
				}
				err = c.calcOffsetSectionPos(file, data, section, startPos, pos)
			}
			if err == nil {
				lines++
				section.incr()
			}
			startPos += int64(pos)
			data, _, pos = goingOn(data, skipTag, pos, filterPosMap)
		}

		if hasFilterWords {
			_, _, emptyPos = c.verifyKeyWords(data, c.customSearches, pos, filterPosMap)
		}
	}
	return lines, tailLine
}

func (c *Component) calcOffsetSectionPos(file *File, data []byte, offsetSection *OffsetSection, startPos int64, pos int) error {
	line := data[:pos]
	curTime, timeIndex := utils.IndexParseTime(string(line))
	if timeIndex == -1 {
		return errors.New("time column name unsupported")
	}
	//parse := utils.TimeParse(curTime)

	//if parse == nil {
	//	return errors.New("parse time error")
	//}

	unixTime := curTime
	offset := (unixTime - c.startTime) / c.interval
	endTime := c.startTime + (offset+1)*c.interval

	from := startPos + int64(pos+1)

	p, err := searchByEndTime(file, from, endTime)
	if err != nil {
		return err
	}
	offsetSection.load(offset, p)
	return nil
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

// goingOn move the pos to next \n and update other related args
func goingOn(data []byte, skipTag, pos int, filterPosMap map[string]int) ([]byte, int, int) {
	skipTag -= pos + 1
	if skipTag <= 0 {
		skipTag = -1
	}
	// update filter pos map
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

// verifyKeyWords 查找搜索内容是否存在
func (c *Component) verifyKeyWords(data []byte, filter []CustomSearch, pos int, filterWordsMap map[string]int) (int, bool, bool) {
	var (
		ok       = true
		emptyPos = true
		skipTag  = -1
	)
	for _, v := range filter {
		var p int
		if v.Operate == KeySearchOperateEqual {
			p = bytes.Index(data, []byte(v.Filter))
		} else if v.Operate == KeySearchOperateLT {
			// "cost":172.34,
			p = ltAndGt(data, v, true)
		} else if v.Operate == KeySearchOperateGT {
			p = ltAndGt(data, v, false)
		}
		if p == -1 {
			ok = false
		} else {
			if filterWordsMap != nil {
				filterWordsMap[v.Filter] = p
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

// todo 代码需要优化
func ltAndGt(data []byte, v CustomSearch, isLtFlag bool) (p int) {
	// "cost":172.34,
	// "cost":172.34}
	p = bytes.Index(data, []byte(`"`+v.Key+`":`))
	if p >= 0 {
		i := p + 3 + len(v.Key) // 开始状态
		for ; i < len(data); i++ {
			// 结尾情况
			if data[i] == ',' || data[i] == '}' {
				number := string(data[p+3+len(v.Key) : i])
				if v.Type == KeySearchTypeFloat64 {
					numFloat64, err := strconv.ParseFloat(number, 64)
					if err != nil {
						elog.Error("parse float64 fail", elog.FieldErr(err), elog.FieldValueAny(number))
						p = -1
					} else {
						if isLtFlag {
							// 小于条件
							// 那么反过来，就是不存在
							if v.ValueFloat64 >= numFloat64 {
								p = -1
							}
						} else {
							if v.ValueFloat64 <= numFloat64 {
								p = -1
							}
						}
					}
				}
				break
			}
		}

	}
	return p
}

func (c *Component) verifyKeyWord(data []byte, filter string, pos int) (int, bool) {
	p := bytes.Index(data, []byte(filter))
	return p, p != -1 && p < pos
}

//
// // search returns first byte number in the ordered `file` where `pattern` is occured as a prefix string
// func (c *Component) searchByWord2(startPos, endPos int64) (int64, error) {
// 	var err error
// 	var cursor = startPos
// 	buff := make([]byte, 0, 4096)
// 	char := make([]byte, 1)
// 	cnt := 0
// 	// scanner := bufio.NewReader(c.file.ptr.)
// 	// scanner.ReadString("/n")
// 	for {
// 		_, _ = c.file.ptr.Seek(cursor, io.SeekStart)
// 		_, err = c.file.ptr.Read(char)
// 		if err != nil {
// 			panic(err)
// 		}
//
// 		if char[0] == '\n' {
// 			if len(buff) > 0 {
// 				// 读取到的行
// 				flag := c.isSearchByKeyWord(string(buff))
// 				if flag {
// 					fmt.Println(string(buff))
// 				}
// 				cnt++
// 				if cnt == 1000000 {
// 					// 超过数量退出
// 					break
// 				}
//
// 			}
// 			buff = buff[:0]
// 		} else {
// 			buff = append(buff, char[0])
// 		}
//
// 		if cursor == endPos {
// 			break
// 		}
// 		cursor++
// 	}
// 	return 0, nil
// }

// min returns minimum of two int64 numbers
func min(a int64, b int64) int64 {
	if a > b {
		return b
	}
	return a
}

//
// // writeBytes writes [start; stop] bytes from fromFile to toFile
// func writeBytes(fromFile *os.File, start int64, stop int64, toFile *os.File, maxBufferSize int64) (int64, error) {
// 	var bytesWritten int64
// 	bytesWritten = 0
// 	if start > stop {
// 		return bytesWritten, nil
// 	}
//
// 	_, _ = fromFile.Seek(start, 0)
// 	buffer := make([]byte, min(stop-start+1, maxBufferSize))
// 	for current := start; current < stop; {
// 		bufferSize := min(stop-current+1, maxBufferSize)
// 		if bufferSize < maxBufferSize {
// 			buffer = make([]byte, bufferSize)
// 		}
//
// 		n, err := fromFile.Read(buffer)
// 		if err != nil {
// 			return bytesWritten, err
// 		} else if int64(n) < bufferSize {
// 			return bytesWritten, errors.New("Error: unexpected end of input")
// 		}
// 		n, err = toFile.Write(buffer)
// 		if err != nil {
// 			return bytesWritten, err
// 		}
// 		bytesWritten += int64(n)
//
// 		current += int64(bufferSize)
// 	}
//
// 	return bytesWritten, nil
// }

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
// 因为from从0开始，这里的to，应该是文件大小-1
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

		_, _ = file.Seek(position, 0)

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
	// fmt.Println("bufferSize -> ", bufferSize)
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

// func (c *Component) seekFile() {
// 	_, err := c.file.ptr.Seek(100, 0)
// 	if err != nil {
// 		panic(err)
// 	}
// 	scanner := bufio.NewScanner(c.file.ptr)
// 	for scanner.Scan() {
// 		fmt.Println(scanner.Text())
// 	}
// }
