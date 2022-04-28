package utils

import (
	"bytes"
	"encoding/gob"
	"reflect"
	"strings"
)

// Diff ..
func Diff(a map[string]interface{}, b map[string]interface{}) map[string]interface{} {
	res := make(map[string]interface{}, 0)
	for name, id := range a {
		if _, ok := b[name]; !ok {
			res[name] = id
		}
	}
	return res
}

// DiffList 求 source 和 dest 的 交/差集
// 此函数效率较低(O(n^2))，请在列表长度较小时使用
func DiffList(source, dest interface{}, cmp func(a, b interface{}) bool) (res []interface{}) {
	if reflect.TypeOf(source).Kind() != reflect.Array && reflect.TypeOf(source).Kind() != reflect.Slice {
		return
	}

	lenA := reflect.ValueOf(source).Len()
	lenB := reflect.ValueOf(dest).Len()
	valA := reflect.ValueOf(source)
	valB := reflect.ValueOf(dest)

	for i := 0; i < lenA; i++ {
		exist := false
		for j := 0; j < lenB; j++ {
			if cmp(valA.Index(i).Interface(), valB.Index(j).Interface()) {
				exist = true
				break
			}
		}
		if !exist {
			res = append(res, valA.Index(i).Interface())
		}
	}

	return
}

// DiffListToSlice 求 source 和 dest 的 交/差集，返回类型和 source 相同
func DiffListToSlice(source, dest interface{}, cmp func(a, b interface{}) bool) (res interface{}) {
	if reflect.TypeOf(source).Kind() != reflect.Array && reflect.TypeOf(source).Kind() != reflect.Slice {
		return
	}

	lenA := reflect.ValueOf(source).Len()
	lenB := reflect.ValueOf(dest).Len()
	valA := reflect.ValueOf(source)
	valB := reflect.ValueOf(dest)

	tmpSlice := make([]reflect.Value, 0)
	for i := 0; i < lenA; i++ {
		exist := false
		for j := 0; j < lenB; j++ {
			if cmp(valA.Index(i).Interface(), valB.Index(j).Interface()) {
				exist = true
				break
			}
		}
		if !exist {
			// res = append(res, valA.Index(i).Interface())
			tmpSlice = append(tmpSlice, valA.Index(i))
		}
	}

	resSlice := reflect.MakeSlice(reflect.TypeOf(source), len(tmpSlice), len(tmpSlice))
	for idx, value := range tmpSlice {
		resSlice.Index(idx).Set(value)
	}

	return resSlice.Interface()
}

// 深度拷贝
func DeepCopy(dst, src interface{}) error {
	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(src); err != nil {
		return err
	}
	return gob.NewDecoder(bytes.NewBuffer(buf.Bytes())).Decode(dst)
}

// FindIndex 查找 item 在 arr 里的下标，通过 cmp 函数进行列表项相等判断
// 如果不存在则返回 -1
func FindIndex(arr interface{}, item interface{}, cmp func(a, b interface{}) bool) (index int) {
	index = -1
	arrType := reflect.TypeOf(arr)
	if arrType.Kind() != reflect.Array && arrType.Kind() != reflect.Slice {
		return
	}

	valArr := reflect.ValueOf(arr)
	lenArr := valArr.Len()
	for i := 0; i < lenArr; i++ {
		if cmp(item, valArr.Index(i).Interface()) {
			return i
		}
	}

	return
}

// StringSliceWithoutRepeat 去除[]string 中的重复元素
// source 源切片
// notContainEmpty 是否不包含空字符串
func StringSliceWithoutRepeat(source []string, notContainEmpty bool) []string {
	if len(source) == 0 {
		return source
	}
	res := make([]string, 0)
	check := make(map[string]struct{})
	for _, item := range source {
		item = strings.TrimSpace(item)
		if notContainEmpty {
			if item == "" {
				continue
			}
		}
		if _, ok := check[item]; ok {
			continue
		}
		res = append(res, item)
		check[item] = struct{}{}
	}
	return res
}

func IsSliceEqual(a, b interface{}) bool {
	if (a == nil) && (b == nil) {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	if reflect.TypeOf(a).Kind() != reflect.Array && reflect.TypeOf(a).Kind() != reflect.Slice {
		return false
	}

	lenA := reflect.ValueOf(a).Len()
	lenB := reflect.ValueOf(b).Len()

	if lenA != lenB {
		return false
	}
	valA := reflect.ValueOf(a)
	valB := reflect.ValueOf(b)

	mapA := make(map[interface{}]int)
	for i := 0; i < lenA; i++ {
		av := valA.Index(i).Interface()
		if _, exist := mapA[av]; !exist {
			mapA[av] = 0
		} else {
			mapA[av]++
		}
	}

	for i := 0; i < lenB; i++ {
		bv := valB.Index(i).Interface()
		if _, exist := mapA[bv]; !exist {
			return false
		}
		mapA[bv]--
		if mapA[bv] < 0 {
			delete(mapA, bv)
		}
	}
	return len(mapA) == 0

}
