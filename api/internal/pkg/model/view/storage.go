package view

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils/mapping"
)

type ReqKafkaJSONMapping struct {
	Data string `json:"data" form:"data"`
}

type ReqStorageCreate struct {
	TableName               string       `form:"tableName" binding:"required"`
	Typ                     int          `form:"typ" binding:"required"` // 1 string 2 float
	Days                    int          `form:"days" binding:"required"`
	Brokers                 string       `form:"brokers" binding:"required"`
	Topics                  string       `form:"topics" binding:"required"`
	Consumers               int          `form:"consumers" binding:"required"`
	KafkaSkipBrokenMessages int          `form:"kafkaSkipBrokenMessages"`
	Desc                    string       `form:"desc"`
	Source                  string       `form:"source" binding:"required"` // Raw JSON data
	DatabaseId              int          `form:"databaseId" binding:"required"`
	TimeField               string       `form:"timeField" binding:"required"`
	TimeFieldParent         string       `form:"timeFieldParent"`
	RawLogField             string       `form:"rawLogField"`
	RawLogFieldParent       string       `form:"rawLogFieldParent"`
	SourceMapping           mapping.List `form:"-"`
	CreateType              int          `form:"createType"`
}

type ReqCreateStorageByTemplateEgo struct {
	Brokers    string `form:"brokers" binding:"required"`
	DatabaseId int    `form:"databaseId" binding:"required"`

	TopicsApp           string `form:"topicsApp" binding:"required"`
	TopicsEgo           string `form:"topicsEgo" binding:"required"`
	TopicsIngressStdout string `form:"topicsIngressStdout" binding:"required"`
	TopicsIngressStderr string `form:"topicsIngressStderr" binding:"required"`
}

type ReqCreateStorageByTemplateILogtail struct {
	Brokers    string `form:"brokers" binding:"required"`
	DatabaseId int    `form:"databaseId" binding:"required"`
	Days       int    `form:"days" binding:"required"`
	Name       string `form:"name" binding:"required"`
	Topic      string `form:"topic" binding:"required"`
}

func (r *ReqStorageCreate) GetRawLogField() string {
	if r.CreateType == constx.TableCreateTypeJSONAsString {
		if r.RawLogFieldParent != "" {
			return fmt.Sprintf("JSONExtractString(JSONExtractRaw(_log, '%s'), '%s')", r.RawLogFieldParent, r.RawLogField)
		} else {
			return fmt.Sprintf("JSONExtractString(_log, '%s')", r.RawLogField)
		}
	}
	if r.RawLogField != "" {
		return r.RawLogField
	}
	return "_log"
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

func (r *ReqStorageCreate) isSkipField(parent, key string) bool {
	if key == "" {
		return false
	}
	if key == r.TimeField ||
		key == r.RawLogField ||
		key == "_time_second_" ||
		key == "_time_nanosecond_" ||
		key == "_raw_log_" ||
		key == parent {
		return true
	}
	return false
}

func (r *ReqStorageCreate) Mapping2Fields(rawLogFieldParent string) string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if r.isSkipField(rawLogFieldParent, v.Key) || r.isSkipField(rawLogFieldParent, v.Parent) {
			continue
		}
		if res == "" {
			res = v.AssembleJSONAsString()
			continue
		}
		res = fmt.Sprintf("%s\n%s", res, v.AssembleJSONAsString())
	}
	return res
}

// IsRawLogFieldString 判断 raw log 字段是否是 string 类型
func (r *ReqStorageCreate) IsRawLogFieldString() bool {
	for _, v := range r.SourceMapping.Data {
		if r.RawLogField == v.Key {
			if v.Typ != mapping.FieldTypeJSON {
				return true
			} else {
				return false
			}
		}
	}
	return false
}

func (r *ReqStorageCreate) Mapping2String(withType bool, rawLogFieldParent string) string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if r.isSkipField(rawLogFieldParent, v.Key) || r.isSkipField(rawLogFieldParent, v.Parent) {
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

type RespStorageAnalysisFields struct {
	BaseFields []StorageAnalysisField `json:"baseFields"`
	LogFields  []StorageAnalysisField `json:"logFields"`
}

type StorageAnalysisField struct {
	Id         int    `json:"id"`
	Tid        int    `json:"tid"`
	Field      string `json:"field"`
	RootName   string `json:"rootName"`
	Typ        int    `json:"typ"`
	HashTyp    int    `json:"hashTyp"`
	Alias      string `json:"alias"`
	Ctime      int64  `json:"ctime"`
	Utime      int64  `json:"utime"`
	OrderField string `json:"orderField"`
}

type ReqStorageUpdate struct {
	MergeTreeTTL            int    `form:"mergeTreeTTL"`
	KafkaBrokers            string `form:"kafkaBrokers"`
	KafkaTopic              string `form:"kafkaTopic"`
	KafkaConsumerNum        int    `form:"kafkaConsumerNum"` // min 1 max 8
	KafkaSkipBrokenMessages int    `form:"kafkaSkipBrokenMessages"`
	Desc                    string `form:"desc"`
	V3TableType             int    `form:"v3TableType"`
}

type (
	ReqStorageUpdateTraceInfo struct {
		TraceTableId int `form:"traceTableId"`
	}
	ReqStorageGetTraceGraph struct {
		StartTime int `form:"startTime"`
		EndTime   int `form:"endTime"`
	}
)

type OperatorViewParams struct {
	Typ              int
	Tid              int
	Did              int
	TableName        string
	CustomTimeField  string
	Current          *db2.BaseView
	List             []*db2.BaseView
	Indexes          map[string]*db2.BaseIndex
	IsCreate         bool
	TimeField        string
	RawLogField      string
	IsKafkaTimestamp int
	Database         *db2.BaseDatabase
}

type JaegerDependencyDataModel struct {
	Timestamp         time.Time
	Parent            string
	Child             string
	CallCount         int64
	ServerDurationP50 float64
	ServerDurationP90 float64
	ServerDurationP99 float64
	ClientDurationP50 float64
	ClientDurationP90 float64
	ClientDurationP99 float64
	ServerSuccessRate float64
	ClientSuccessRate float64
	Time              time.Time
}

type RespJaegerDependencyDataModel struct {
	Parent            string  `json:"parent"`
	Child             string  `json:"child"`
	CallCount         int64   `json:"callCount"`
	ServerDurationP50 float64 `json:"serverDurationP50"`
	ServerDurationP90 float64 `json:"serverDurationP90"`
	ServerDurationP99 float64 `json:"serverDurationP99"`
	ClientDurationP50 float64 `json:"clientDurationP50"`
	ClientDurationP90 float64 `json:"clientDurationP90"`
	ClientDurationP99 float64 `json:"clientDurationP99"`
	ServerSuccessRate float64 `json:"serverSuccessRate"`
	ClientSuccessRate float64 `json:"clientSuccessRate"`
}
