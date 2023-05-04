package view

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/utils/mapping"
)

type ReqKafkaJSONMapping struct {
	Data string `json:"data" form:"data"`
}

type ReqStorageCreate struct {
	TableName               string `form:"tableName" binding:"required"`
	Typ                     int    `form:"typ" binding:"required"` // 1 string 2 float
	Days                    int    `form:"days" binding:"required"`
	Brokers                 string `form:"brokers" binding:"required"`
	Topics                  string `form:"topics" binding:"required"`
	Consumers               int    `form:"consumers" binding:"required"`
	KafkaSkipBrokenMessages int    `form:"kafkaSkipBrokenMessages"`
	Desc                    string `form:"desc"`

	Source      string `form:"source" binding:"required"` // Raw JSON data
	DatabaseId  int    `form:"databaseId" binding:"required"`
	TimeField   string `form:"timeField" binding:"required"`
	RawLogField string `form:"rawLogField"`

	SourceMapping mapping.List `form:"-"`
	CreateType    int          `form:"createType"`
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
	Name       string `form:"name" binding:"required"`
	Topic      string `form:"topic" binding:"required"`
}

func (r *ReqStorageCreate) GetRawLogField() string {
	if r.CreateType == constx.TableCreateTypeJSONAsString {
		return fmt.Sprintf("JSONExtractString(_log, '%s')", r.RawLogField)
	}
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

func (r *ReqStorageCreate) Mapping2Fields() string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if v.Key == r.TimeField ||
			v.Key == r.RawLogField ||
			v.Key == "_time_second_" ||
			v.Key == "_time_nanosecond_" ||
			v.Key == "_raw_log_" {
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

func (r *ReqStorageCreate) Mapping2String(withType bool) string {
	var res string
	if len(r.SourceMapping.Data) == 0 {
		return res
	}
	for _, v := range r.SourceMapping.Data {
		if v.Key == r.TimeField ||
			v.Key == r.RawLogField ||
			v.Key == "_time_second_" ||
			v.Key == "_time_nanosecond_" ||
			v.Key == "_raw_log_" {
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
	Id       int    `json:"id"`
	Tid      int    `json:"tid"`
	Field    string `json:"field"`
	RootName string `json:"rootName"`
	Typ      int    `json:"typ"`
	HashTyp  int    `json:"hashTyp"`
	Alias    string `json:"alias"`
	Ctime    int64  `json:"ctime"`
	Utime    int64  `json:"utime"`
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
	Current          *db.BaseView
	List             []*db.BaseView
	Indexes          map[string]*db.BaseIndex
	IsCreate         bool
	TimeField        string
	RawLogField      string
	IsKafkaTimestamp int
	Database         *db.BaseDatabase
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
