package view

import (
	"encoding/json"
	"fmt"
)

type ReqKafkaJSONMapping struct {
	Data string `json:"data" form:"data"`
}

type ReqStorageCreate struct {
	TableName string `form:"tableName" binding:"required"`
	Typ       int    `form:"typ" binding:"required"` // 1 string 2 float
	Days      int    `form:"days" binding:"required"`
	Brokers   string `form:"brokers" binding:"required"`
	Topics    string `form:"topics" binding:"required"`
	Consumers int    `form:"consumers" binding:"required"`
	Desc      string `form:"desc"`

	Source      string `form:"source" binding:"required"` // Raw JSON data
	DatabaseId  int    `form:"databaseId" binding:"required"`
	TimeField   string `form:"timeField" binding:"required"`
	RawLogField string `form:"rawLogField" binding:"required"`

	SourceMapping MappingStruct `form:"-"`
}

func (r *ReqStorageCreate) GetRawLogField() string {
	if r.RawLogField != "" {
		return r.RawLogField
	}
	return "_log_"
}

func (r *ReqStorageCreate) SelectFields() string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if v.Key == r.TimeField || v.Key == r.RawLogField {
			continue
		}
		if res == "" {
			res = fmt.Sprintf("`%s`", v.Key)
			continue
		}
		res = fmt.Sprintf("%s,`%s`", res, v.Key)
	}
	if res == "" {
		res = "_time_second_,_time_nanosecond_,_raw_log_"
	} else {
		res = res + ",_time_second_,_time_nanosecond_,_raw_log_"
	}
	return res
}

func (r *ReqStorageCreate) JSON() string {
	resp, _ := json.Marshal(r)
	return string(resp)
}

func ReqStorageCreateUnmarshal(res string) ReqStorageCreate {
	resp := ReqStorageCreate{}
	_ = json.Unmarshal([]byte(res), &resp)
	return resp
}

func (r *ReqStorageCreate) Mapping2String(withType bool) string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if v.Key == r.TimeField || v.Key == r.RawLogField {
			continue
		}
		if res == "" {
			res = v.Assemble(withType)
			continue
		}
		res = fmt.Sprintf("%s\n%s", res, v.Assemble(withType))
	}
	return res
}

type MappingStruct struct {
	Data []MappingStructItem `json:"data"`
}

type MappingStructItem struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (m *MappingStructItem) Assemble(withType bool) string {
	if withType {
		return fmt.Sprintf("`%s` %s,", m.Key, m.Value)
	}
	return fmt.Sprintf("`%s`,", m.Key)
}
