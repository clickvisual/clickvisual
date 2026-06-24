package view

type Candidate struct {
	Path       string  `json:"path"`
	Label      string  `json:"label"`
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

type DetectionResult struct {
	TimeCandidates       []Candidate              `json:"timeCandidates"`
	BodyCandidates       []Candidate              `json:"bodyCandidates"`
	TagCandidates        []Candidate              `json:"tagCandidates"`
	NestedJSONCandidates []Candidate              `json:"nestedJsonCandidates"`
	Risks                []QueryWarning           `json:"risks"`
	SamplePreview        []map[string]interface{} `json:"samplePreview"`
}

type NormalizationDraft struct {
	TimePath        string `json:"timePath"`
	BodyPath        string `json:"bodyPath"`
	TagPath         string `json:"tagPath"`
	NeedNestedJSON  bool   `json:"needNestedJson"`
	NestedJSONPath  string `json:"nestedJsonPath,omitempty"`
	RequiresConfirm bool   `json:"requiresConfirm"`
}

type QueryableField struct {
	FieldKey             string           `json:"fieldKey"`
	DisplayName          string           `json:"displayName"`
	Path                 string           `json:"path"`
	Source               QueryFieldSource `json:"source"`
	ValueType            QueryValueType   `json:"valueType"`
	IsScalar             bool             `json:"isScalar"`
	Coverage             float64          `json:"coverage"`
	Stability            float64          `json:"stability"`
	RecommendedOperators []QueryOperator  `json:"recommendedOperators"`
	IsAccelerated        bool             `json:"isAccelerated"`
	AccelerationStatus   string           `json:"accelerationStatus"`
	Examples             []string         `json:"examples,omitempty"`
}

type PublishDraft struct {
	SourceType      string             `json:"sourceType"`
	Normalization   NormalizationDraft `json:"normalization"`
	QueryableFields []QueryableField   `json:"queryableFields"`
	DefaultFields   []string           `json:"defaultFields"`
	Warnings        []QueryWarning     `json:"warnings"`
	RequiresConfirm bool               `json:"requiresConfirm"`
}

type PublishDraftRequest struct {
	SourceType      string             `json:"sourceType"`
	Normalization   NormalizationDraft `json:"normalization"`
	QueryableFields []QueryableField   `json:"queryableFields"`
	DefaultFields   []string           `json:"defaultFields"`
}

type PublishTarget struct {
	InstanceId    int    `json:"instanceId"`
	DatabaseName  string `json:"databaseName"`
	TableName     string `json:"tableName"`
	TimeFieldType int    `json:"timeFieldType"`
	Cluster       string `json:"cluster,omitempty"`
	Desc          string `json:"desc,omitempty"`
}

type PublishRequest struct {
	SourceType      string             `json:"sourceType"`
	Normalization   NormalizationDraft `json:"normalization"`
	QueryableFields []QueryableField   `json:"queryableFields"`
	DefaultFields   []string           `json:"defaultFields"`
	Target          PublishTarget      `json:"target"`
}

type PublishResult struct {
	InstanceId    int      `json:"instanceId"`
	DatabaseId    int      `json:"databaseId"`
	DatabaseName  string   `json:"databaseName"`
	TableId       int      `json:"tableId"`
	TableName     string   `json:"tableName"`
	FieldCount    int      `json:"fieldCount"`
	DefaultFields []string `json:"defaultFields"`
}
