package report

import (
	"fmt"
	"sort"
	"strings"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	sourcesvc "github.com/clickvisual/clickvisual/api/internal/service/source"
)

const reportResultRowLimit = 1000

func GetResults(reportID int) (view.RespReportResultData, error) {
	return defaultService.GetResults(reportID)
}

func (s *Service) GetResults(reportID int) (view.RespReportResultData, error) {
	if s.useDB() {
		return s.getResultsFromDB(reportID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	editor := s.editors[activeID]
	now := s.now()
	start := now.Add(-1 * time.Hour)
	end := now
	if editor.Builder != nil && strings.TrimSpace(editor.Builder.TimeRange) == "1d" {
		start, end, _, _, _ = reportComparisonWindow(editor.Builder.TimeRange, now)
	}
	rows := []view.RespReportResultPoint{
		{
			BucketTime: formatReportTime(start.Add(15 * time.Minute)),
			BlockKey:   "default",
			BlockLabel: "默认条件块",
			MetricName: "总量",
			MetricKind: string(aggregationMetricCount),
			Value:      120,
			CountValue: 120,
		},
		{
			BucketTime: formatReportTime(start.Add(30 * time.Minute)),
			BlockKey:   "default",
			BlockLabel: "默认条件块",
			MetricName: "总量",
			MetricKind: string(aggregationMetricCount),
			Value:      168,
			CountValue: 168,
		},
	}
	return buildReportResultData(activeID, "mock", "", fmt.Sprintf("cv_report_agg_%d", activeID), start, end, rows), nil
}

func (s *Service) getResultsFromDB(reportID int) (view.RespReportResultData, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	report, err := s.getReportByIDFromDB(activeID)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	builder := resolveReportBuilder(report)
	if builder == nil {
		return view.RespReportResultData{}, fmt.Errorf("报表 builder 不存在")
	}
	acceleration, found, err := s.getReportAccelerationByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	if !found || acceleration.Status != dbmodel.ReportAccelerationStatusReady {
		return view.RespReportResultData{
			ReportID:    activeID,
			Source:      "aggregation",
			Database:    acceleration.SourceDatabase,
			TargetTable: acceleration.TargetTable,
			Rows:        []view.RespReportResultPoint{},
			Series:      []view.RespReportResultSeries{},
		}, nil
	}
	now := s.now()
	currentStart, currentEnd, _, _, err := reportComparisonWindow(builder.TimeRange, now)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	queryText := buildReportResultTableQuery(acceleration.SourceDatabase, acceleration.TargetTable, currentStart, currentEnd, reportResultRowLimit)
	instance, err := s.getReportClickHouseInstance(acceleration.InstanceID)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	operator := sourcesvc.Instantiate(&sourcesvc.Source{
		DSN: instance.GetDSN(),
		Typ: dbmodel.SourceTypClickHouse,
	})
	if operator == nil {
		return view.RespReportResultData{}, fmt.Errorf("clickhouse operator 初始化失败")
	}
	rawRows, err := operator.Query(queryText)
	if err != nil {
		return view.RespReportResultData{}, err
	}
	rows := reportResultPointsFromRows(rawRows, *builder)
	return buildReportResultData(activeID, "aggregation", acceleration.SourceDatabase, acceleration.TargetTable, currentStart, currentEnd, rows), nil
}

func buildReportResultTableQuery(database, table string, start, end time.Time, limit int) string {
	if limit <= 0 {
		limit = reportResultRowLimit
	}
	return fmt.Sprintf(
		"SELECT bucket_time, block_key, metric_name, toInt32(group_kind) AS group_kind, group_value, toFloat64(ifNull(sumMerge(sum_value), 0)) AS sum_value, toFloat64(ifNull(sumMerge(count_value), 0)) AS count_value, toFloat64(uniqMerge(uniq_state)) AS uniq_value FROM %s WHERE bucket_time >= toDateTime('%s', '%s') AND bucket_time < toDateTime('%s', '%s') GROUP BY bucket_time, block_key, metric_name, group_kind, group_value ORDER BY bucket_time ASC, block_key ASC, metric_name ASC, group_kind ASC, count_value DESC, group_value ASC LIMIT %d",
		quoteTable(database, table),
		start.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		end.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		limit,
	)
}

func reportResultPointsFromRows(rows []map[string]interface{}, builder view.ReqReportBuilder) []view.RespReportResultPoint {
	metricKinds := reportMetricKindIndex(builder)
	blockLabels := reportBlockLabelIndex(builder)
	result := make([]view.RespReportResultPoint, 0, len(rows))
	for _, row := range rows {
		bucket, ok := toTime(row["bucket_time"])
		if !ok {
			continue
		}
		blockKey := strings.TrimSpace(fmt.Sprint(row["block_key"]))
		metricName := strings.TrimSpace(fmt.Sprint(row["metric_name"]))
		groupKind := int(toFloat64Value(row["group_kind"]))
		groupValue := strings.TrimSpace(fmt.Sprint(row["group_value"]))
		sumValue := toFloat64Value(row["sum_value"])
		countValue := toFloat64Value(row["count_value"])
		uniqValue := toFloat64Value(row["uniq_value"])
		metricKind := metricKinds[reportMetricIdentity(blockKey, metricName)]
		if metricKind == "" && groupKind == 1 {
			metricKind = string(aggregationMetricTopN)
		}
		if metricKind == "" {
			metricKind = string(aggregationMetricCount)
		}
		result = append(result, view.RespReportResultPoint{
			BucketTime: formatReportTime(reportDisplayTime(bucket)),
			BlockKey:   blockKey,
			BlockLabel: blockLabels[blockKey],
			MetricName: metricName,
			MetricKind: metricKind,
			GroupKind:  groupKind,
			GroupValue: groupValue,
			Value:      reportResultValue(metricKind, sumValue, countValue, uniqValue),
			SumValue:   sumValue,
			CountValue: countValue,
			UniqValue:  uniqValue,
		})
	}
	return result
}

func reportMetricKindIndex(builder view.ReqReportBuilder) map[string]string {
	result := make(map[string]string)
	for _, block := range normalizeReportBlocks(builder) {
		blockKey := strings.TrimSpace(block.Key)
		if blockKey == "" {
			blockKey = "default"
		}
		for _, metric := range block.Metrics {
			parsed, err := parseAggregationMetric(blockKey, metric)
			if err != nil {
				continue
			}
			result[reportMetricIdentity(blockKey, parsed.Label)] = string(parsed.Kind)
		}
	}
	return result
}

func reportBlockLabelIndex(builder view.ReqReportBuilder) map[string]string {
	result := make(map[string]string)
	for _, block := range normalizeReportBlocks(builder) {
		blockKey := strings.TrimSpace(block.Key)
		if blockKey == "" {
			blockKey = "default"
		}
		blockLabel := strings.TrimSpace(block.Label)
		if blockLabel == "" {
			blockLabel = blockKey
		}
		result[blockKey] = blockLabel
	}
	return result
}

func reportMetricIdentity(blockKey, metricName string) string {
	return strings.TrimSpace(blockKey) + "\x00" + strings.TrimSpace(metricName)
}

func reportResultValue(metricKind string, sumValue, countValue, uniqValue float64) float64 {
	switch aggregationMetricKind(metricKind) {
	case aggregationMetricSum:
		return sumValue
	case aggregationMetricAvg:
		if countValue == 0 {
			return 0
		}
		return sumValue / countValue
	case aggregationMetricUniq:
		return uniqValue
	default:
		return countValue
	}
}

func buildReportResultData(reportID int, source, database, targetTable string, start, end time.Time, rows []view.RespReportResultPoint) view.RespReportResultData {
	seriesByKey := make(map[string]*view.RespReportResultSeries)
	buckets := make(map[string]struct{})
	for _, row := range rows {
		buckets[row.BucketTime] = struct{}{}
		seriesKey := strings.Join([]string{row.BlockKey, row.MetricName, fmt.Sprint(row.GroupKind), row.GroupValue}, "\x00")
		series, ok := seriesByKey[seriesKey]
		if !ok {
			series = &view.RespReportResultSeries{
				SeriesKey:  seriesKey,
				BlockKey:   row.BlockKey,
				BlockLabel: row.BlockLabel,
				MetricName: row.MetricName,
				MetricKind: row.MetricKind,
				GroupKind:  row.GroupKind,
				GroupValue: row.GroupValue,
				Points:     []view.RespReportResultPoint{},
			}
			seriesByKey[seriesKey] = series
		}
		series.Total += row.Value
		series.Points = append(series.Points, row)
	}
	seriesList := make([]view.RespReportResultSeries, 0, len(seriesByKey))
	for _, series := range seriesByKey {
		sort.Slice(series.Points, func(i, j int) bool {
			return series.Points[i].BucketTime < series.Points[j].BucketTime
		})
		seriesList = append(seriesList, *series)
	}
	sort.Slice(seriesList, func(i, j int) bool {
		if seriesList[i].Total == seriesList[j].Total {
			return seriesList[i].SeriesKey < seriesList[j].SeriesKey
		}
		return seriesList[i].Total > seriesList[j].Total
	})
	return view.RespReportResultData{
		ReportID:    reportID,
		Source:      source,
		Database:    database,
		TargetTable: targetTable,
		WindowStart: formatReportTime(start),
		WindowEnd:   formatReportTime(end),
		BucketCount: len(buckets),
		Series:      seriesList,
		Rows:        rows,
	}
}
