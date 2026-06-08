package view

type QueryFieldSource string

const (
	QueryFieldSourceColumn   QueryFieldSource = "column"
	QueryFieldSourceJSONPath QueryFieldSource = "json_path"
	QueryFieldSourceTagPath  QueryFieldSource = "tag_path"
	QueryFieldSourceDerived  QueryFieldSource = "derived"
)

type QueryValueType string

const (
	QueryValueTypeString   QueryValueType = "string"
	QueryValueTypeNumber   QueryValueType = "number"
	QueryValueTypeBoolean  QueryValueType = "boolean"
	QueryValueTypeDatetime QueryValueType = "datetime"
	QueryValueTypeUnknown  QueryValueType = "unknown"
)

type QueryOperator string

const (
	QueryOperatorEQ          QueryOperator = "="
	QueryOperatorNEQ         QueryOperator = "!="
	QueryOperatorContains    QueryOperator = "contains"
	QueryOperatorNotContains QueryOperator = "not_contains"
	QueryOperatorIn          QueryOperator = "in"
	QueryOperatorGT          QueryOperator = ">"
	QueryOperatorGTE         QueryOperator = ">="
	QueryOperatorLT          QueryOperator = "<"
	QueryOperatorLTE         QueryOperator = "<="
	QueryOperatorBetween     QueryOperator = "between"
	QueryOperatorExists      QueryOperator = "exists"
	QueryOperatorNotExists   QueryOperator = "not_exists"
	QueryOperatorIsTrue      QueryOperator = "is_true"
	QueryOperatorIsFalse     QueryOperator = "is_false"
)

type QueryFieldRef struct {
	FieldKey       string           `json:"fieldKey" form:"fieldKey"`
	DisplayName    string           `json:"displayName" form:"displayName"`
	Source         QueryFieldSource `json:"source" form:"source"`
	Path           string           `json:"path" form:"path"`
	ValueType      QueryValueType   `json:"valueType" form:"valueType"`
	IsAccelerated  bool             `json:"isAccelerated" form:"isAccelerated"`
	AcceleratedCol string           `json:"acceleratedCol,omitempty" form:"acceleratedCol"`
}

type QueryConditionV2 struct {
	Field    QueryFieldRef `json:"field" form:"field"`
	Operator QueryOperator `json:"operator" form:"operator"`
	Value    interface{}   `json:"value,omitempty" form:"value"`
	ValueTo  interface{}   `json:"valueTo,omitempty" form:"valueTo"`
}

type QuerySort struct {
	FieldKey   string `json:"fieldKey" form:"fieldKey"`
	Descending bool   `json:"descending" form:"descending"`
}

type QueryRequestV2 struct {
	Tid           int                `json:"tid" form:"tid"`
	ST            int64              `json:"st" form:"st"`
	ET            int64              `json:"et" form:"et"`
	Page          uint32             `json:"page" form:"page"`
	PageSize      uint32             `json:"pageSize" form:"pageSize"`
	Conditions    []QueryConditionV2 `json:"conditions" form:"conditions"`
	Sorts         []QuerySort        `json:"sorts" form:"sorts"`
	DisplayFields []string           `json:"displayFields" form:"displayFields"`
}

type QueryFieldStatsRequest struct {
	QueryRequestV2
	Field QueryFieldRef `json:"field" form:"field"`
	Limit int           `json:"limit" form:"limit"`
}

type PlannedCondition struct {
	FieldKey    string `json:"fieldKey"`
	Execution   string `json:"execution"`
	Expression  string `json:"expression"`
	HighCost    bool   `json:"highCost"`
	WarningCode string `json:"warningCode,omitempty"`
}

type QueryWarning struct {
	Code    string `json:"code"`
	Level   string `json:"level"`
	Message string `json:"message"`
}

type QueryPlan struct {
	Table             string             `json:"table"`
	PlannedConditions []PlannedCondition `json:"plannedConditions"`
	Warnings          []QueryWarning     `json:"warnings"`
	OrderBy           []string           `json:"orderBy"`
}

type QueryLogsField struct {
	Field string `json:"field"`
	Alias string `json:"alias"`
}
