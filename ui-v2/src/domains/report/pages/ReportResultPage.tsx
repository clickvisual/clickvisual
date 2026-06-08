import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReportResults, getReportWorkspace } from "../api/report";
import type {
  ReportEditorDraft,
  ReportResultData,
  ReportResultSeries
} from "../types/contracts";

function formatReportResultValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 1000) {
    return Math.round(value).toLocaleString("zh-CN");
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

function getReportResultSeriesLabel(series: ReportResultSeries) {
  const group = series.groupValue ? ` / ${series.groupValue}` : "";
  return `${series.blockLabel || series.blockKey} / ${series.metricName}${group}`;
}

function getMetricKindLabel(value: string) {
  switch (value) {
    case "sum":
      return "求和";
    case "avg":
      return "平均值";
    case "uniq":
      return "去重";
    case "topn":
      return "TopN";
    default:
      return "计数";
  }
}

export default function ReportResultPage() {
  const { reportId: reportIdParam } = useParams<{ reportId?: string }>();
  const reportId = Number(reportIdParam);
  const [editor, setEditor] = useState<ReportEditorDraft | null>(null);
  const [resultData, setResultData] = useState<ReportResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const topSeries = useMemo(() => (resultData?.series ?? []).slice(0, 8), [resultData]);
  const resultRows = resultData?.rows ?? [];
  const maxValue = Math.max(
    1,
    ...topSeries.flatMap((series) =>
      series.points.map((point) => Math.max(0, point.value))
    )
  );
  const totalValue = topSeries.reduce((sum, series) => sum + series.total, 0);

  async function load() {
    if (!Number.isInteger(reportId) || reportId <= 0) {
      setErrorMessage("reportId 不合法");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const [workspace, results] = await Promise.all([
        getReportWorkspace(reportId),
        getReportResults(reportId)
      ]);
      setEditor(workspace.editor);
      setResultData(results);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "报表展示数据加载失败");
      setResultData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [reportId]);

  return (
    <div className="cv-page cv-report-page cv-report-display-page">
      <section className="cv-panel cv-report-display-hero">
        <div>
          <p className="cv-label">REPORT DISPLAY</p>
          <h1 className="cv-page-title">{editor?.name || `报表 #${reportId}`}</h1>
          <p className="cv-page-description">
            展示报表落地后的聚合结果表数据。这里不编辑调度，只负责把已落地数据渲染为图表和明细。
          </p>
        </div>
        <div className="cv-header-actions">
          <Link className="cv-secondary-button" to={`/v2/reports/${reportId}`}>
            返回配置
          </Link>
          <button
            type="button"
            className="cv-action-button"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? "刷新中..." : "刷新数据"}
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="cv-inline-notice" role="alert">
          报表展示加载失败：{errorMessage}
        </div>
      ) : null}

      <section className="cv-report-display-grid">
        <div className="cv-panel cv-report-display-main">
          <div className="cv-panel-header">
            <div>
              <h2 className="cv-panel-title">结果趋势</h2>
              <p className="cv-panel-description">
                {resultData?.targetTable
                  ? `${resultData.database ? `${resultData.database}.` : ""}${resultData.targetTable} · ${resultData.windowStart || "未记录"} ~ ${resultData.windowEnd || "未记录"}`
                  : "等待结果表数据"}
              </p>
            </div>
          </div>

          {loading && !resultData ? (
            <div className="cv-empty-inline">正在读取报表结果表...</div>
          ) : topSeries.length > 0 ? (
            <div className="cv-report-result cv-report-result--display">
              <div className="cv-report-result__chart">
                {topSeries.map((series) => (
                  <div key={series.seriesKey} className="cv-report-result-series">
                    <div className="cv-report-result-series__head">
                      <strong>{getReportResultSeriesLabel(series)}</strong>
                      <span>{formatReportResultValue(series.total)}</span>
                    </div>
                    <div className="cv-report-result-series__bars">
                      {series.points.map((point) => (
                        <div
                          key={`${series.seriesKey}-${point.bucketTime}`}
                          className="cv-report-result-bar"
                          title={`${point.bucketTime}：${formatReportResultValue(point.value)}`}
                        >
                          <span
                            className="cv-report-result-bar__fill"
                            style={{
                              height: `${Math.max(3, (Math.max(0, point.value) / maxValue) * 100)}%`
                            }}
                          />
                          <span className="cv-report-result-bar__label">
                            {point.bucketTime.slice(11, 16) || point.bucketTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="cv-empty-inline">
              暂无可展示数据。请确认报表聚合状态已就绪，且结果表在当前窗口内已有数据。
            </div>
          )}
        </div>

        <aside className="cv-panel cv-report-display-side">
          <div className="cv-panel-header">
            <div>
              <h2 className="cv-panel-title">展示摘要</h2>
            </div>
          </div>
          <div className="cv-report-inline-summary">
            <div className="cv-report-inline-summary__item">
              <span className="cv-report-inline-summary__label">指标系列</span>
              <strong>{topSeries.length}</strong>
            </div>
            <div className="cv-report-inline-summary__item">
              <span className="cv-report-inline-summary__label">时间桶</span>
              <strong>{resultData?.bucketCount ?? 0}</strong>
            </div>
            <div className="cv-report-inline-summary__item">
              <span className="cv-report-inline-summary__label">明细行</span>
              <strong>{resultRows.length}</strong>
            </div>
            <div className="cv-report-inline-summary__item">
              <span className="cv-report-inline-summary__label">总值</span>
              <strong>{formatReportResultValue(totalValue)}</strong>
            </div>
          </div>
          <div className="cv-section-stack cv-section-stack--tight">
            {topSeries.map((series) => (
              <div key={series.seriesKey} className="cv-status-card cv-status-card--compact">
                <strong>{getReportResultSeriesLabel(series)}</strong>
                <span className="cv-muted">
                  {getMetricKindLabel(series.metricKind)} · {formatReportResultValue(series.total)}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="cv-panel">
        <div className="cv-panel-header">
          <div>
            <h2 className="cv-panel-title">结果明细</h2>
            <p className="cv-panel-description">按时间桶、条件块、指标和分组展示聚合结果。</p>
          </div>
        </div>
        {resultRows.length > 0 ? (
          <div className="cv-table-wrap cv-table-wrap--compact">
            <table className="cv-table cv-report-result-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>条件块</th>
                  <th>指标</th>
                  <th>类型</th>
                  <th>分组</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row, index) => (
                  <tr key={`${row.bucketTime}-${row.blockKey}-${row.metricName}-${row.groupValue}-${index}`}>
                    <td>{row.bucketTime}</td>
                    <td>{row.blockLabel || row.blockKey}</td>
                    <td>{row.metricName}</td>
                    <td>{getMetricKindLabel(row.metricKind)}</td>
                    <td>{row.groupValue || "-"}</td>
                    <td>{formatReportResultValue(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cv-empty-inline">暂无结果明细</div>
        )}
      </section>
    </div>
  );
}
