package querydetect

import (
	"errors"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func Detect(sampleRows []map[string]interface{}) (view.DetectionResult, error) {
	if len(sampleRows) == 0 {
		return view.DetectionResult{}, errors.New("samples cannot be empty")
	}
	return view.DetectionResult{
		TimeCandidates:       detectTimeCandidates(sampleRows),
		BodyCandidates:       detectBodyCandidates(sampleRows),
		TagCandidates:        detectTagCandidates(sampleRows),
		NestedJSONCandidates: detectNestedJSONCandidates(sampleRows),
		Risks:                detectRisks(sampleRows),
		SamplePreview:        sampleRows,
	}, nil
}

func BuildNormalizationDraft(result view.DetectionResult) view.NormalizationDraft {
	draft := view.NormalizationDraft{
		RequiresConfirm: true,
	}
	if len(result.TimeCandidates) > 0 {
		draft.TimePath = result.TimeCandidates[0].Path
	}
	if len(result.BodyCandidates) > 0 {
		draft.BodyPath = result.BodyCandidates[0].Path
	}
	if len(result.TagCandidates) > 0 {
		draft.TagPath = result.TagCandidates[0].Path
	}
	if len(result.NestedJSONCandidates) > 0 {
		draft.NeedNestedJSON = true
		draft.NestedJSONPath = result.NestedJSONCandidates[0].Path
	}
	return draft
}

func BuildQueryableFields(sampleRows []map[string]interface{}, draft view.NormalizationDraft, accelerated map[string]string) ([]view.QueryableField, error) {
	if len(sampleRows) == 0 {
		return nil, errors.New("samples cannot be empty")
	}
	stats := collectFieldStats(sampleRows, draft)
	fields := toQueryableFields(stats, draft, accelerated)
	return fields, nil
}
