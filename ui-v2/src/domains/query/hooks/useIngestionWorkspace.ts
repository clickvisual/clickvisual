import { useEffect, useMemo, useState } from "react";
import { buildPublishDraft, detectIngestionShape, listQueryableFields, publishIngestion, runQueryAIDraft } from "../api/query";
import type {
  AIDraftResponse,
  AIIngestionDetectExplainInput,
  AIIngestionFieldRecommendInput,
  AIIngestionPublishSummaryInput,
  DetectionResult,
  IngestionPublishRequest,
  IngestionPublishResult,
  IngestionPublishTarget,
  IngestionPublishDraftPayload,
  IngestionSourceType,
  IngestionStep,
  NormalizationDraft,
  PublishDraft,
  QueryableField
} from "../types/contracts";

const DEFAULT_STEPS: IngestionStep[] = ["source", "detect", "normalize", "fields", "publish"];

const DEFAULT_PUBLISH_TARGET: IngestionPublishTarget = {
  instanceId: 0,
  databaseName: "",
  tableName: "",
  timeFieldType: 1,
  cluster: "",
  desc: ""
};

const SAMPLE_KAFKA_JSON: Record<string, unknown> = {
  contents: {
    _source_: "stderr",
    _time_: "2026-04-24T11:31:12.311684863+08:00",
    content: "{\"lv\":\"debug\",\"ts\":1777001472.311435,\"msg\":\"podDiscovery listPods success\",\"app\":\"svc-file\"}"
  },
  tags: {
    "container.name": "svc-file",
    "k8s.namespace.name": "default"
  },
  time: 1777001472
};

function readPathValue(sample: Record<string, unknown>, path: string): unknown {
  if (!path.trim()) {
    return undefined;
  }
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, sample);
}

function inferTimeFieldType(samples: Array<Record<string, unknown>>, timePath: string): number {
  const path = timePath.trim();
  if (!path) {
    return 1;
  }

  const values = samples
    .map((sample) => readPathValue(sample, path))
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number");

  if (values.length === 0) {
    return 1;
  }

  const first = values[0];
  if (typeof first === "string") {
    const normalized = first.trim();
    const fractionMatch = normalized.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (fractionMatch) {
      const precision = fractionMatch[1].length;
      if (precision <= 3) {
        return 3;
      }
      if (precision <= 6) {
        return 4;
      }
      return 5;
    }
    return 0;
  }

  const abs = Math.abs(first);
  if (!Number.isFinite(abs)) {
    return 1;
  }

  if (!Number.isInteger(first)) {
    const decimals = String(first).split(".")[1]?.replace(/0+$/, "").length ?? 0;
    if (decimals <= 3) {
      return 3;
    }
    if (decimals <= 6) {
      return 4;
    }
    return 5;
  }

  if (abs >= 1e17) {
    return 5;
  }
  if (abs >= 1e14) {
    return 4;
  }
  if (abs >= 1e11) {
    return 2;
  }
  if (abs >= 1e9) {
    return 1;
  }
  return 0;
}

type AIDraftKind = "detectionExplain" | "fieldRecommend" | "publishSummary";

type AIDraftState = {
  loading: boolean;
  errorMessage: string;
};

const EMPTY_AI_DRAFT_STATE: Record<AIDraftKind, AIDraftState> = {
  detectionExplain: { loading: false, errorMessage: "" },
  fieldRecommend: { loading: false, errorMessage: "" },
  publishSummary: { loading: false, errorMessage: "" }
};

export function useIngestionWorkspace() {
  const [step, setStep] = useState<IngestionStep>("source");
  const [sourceType, setSourceType] = useState<IngestionSourceType | null>(null);
  const [sampleInput, setSampleInput] = useState<Array<Record<string, unknown>>>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [normalizationDraft, setNormalizationDraft] = useState<NormalizationDraft | null>(null);
  const [queryableFields, setQueryableFields] = useState<QueryableField[]>([]);
  const [defaultFields, setDefaultFields] = useState<string[]>([]);
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);
  const [publishTarget, setPublishTarget] = useState<IngestionPublishTarget>(DEFAULT_PUBLISH_TARGET);
  const [publishResult, setPublishResult] = useState<IngestionPublishResult | null>(null);
  const [isPublishTimeFieldTypeManual, setIsPublishTimeFieldTypeManual] = useState(false);
  const [aiDrafts, setAIDrafts] = useState<{
    detectionExplain?: AIDraftResponse | null;
    fieldRecommend?: AIDraftResponse | null;
    publishSummary?: AIDraftResponse | null;
  }>({});
  const [aiDraftState, setAIDraftState] = useState<Record<AIDraftKind, AIDraftState>>(EMPTY_AI_DRAFT_STATE);
  const [confirmations, setConfirmations] = useState({
    normalizationConfirmed: false,
    fieldsConfirmed: false,
    publishConfirmed: false
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isPublishTimeFieldTypeManual || !normalizationDraft?.timePath) {
      return;
    }
    const inferred = inferTimeFieldType(sampleInput, normalizationDraft.timePath);
    setPublishTarget((current) =>
      current.timeFieldType === inferred
        ? current
        : {
            ...current,
            timeFieldType: inferred
          }
    );
  }, [isPublishTimeFieldTypeManual, normalizationDraft?.timePath, sampleInput]);

  const summary = useMemo(
    () => ({
      sourceType,
      timePath: normalizationDraft?.timePath ?? "",
      bodyPath: normalizationDraft?.bodyPath ?? "",
      tagPath: normalizationDraft?.tagPath ?? "",
      nestedJsonPath: normalizationDraft?.nestedJsonPath ?? "",
      fieldCount: queryableFields.length,
      defaultFieldCount: defaultFields.length,
      warningCount: detectionResult?.risks.length ?? 0
    }),
    [defaultFields.length, detectionResult?.risks.length, normalizationDraft, queryableFields.length, sourceType]
  );

  function resetWorkspace(nextSource?: IngestionSourceType) {
    setSourceType(nextSource ?? null);
    setStep("source");
    setSampleInput([]);
    setDetectionResult(null);
    setNormalizationDraft(null);
    setQueryableFields([]);
    setDefaultFields([]);
    setPublishDraft(null);
    setPublishTarget(DEFAULT_PUBLISH_TARGET);
    setPublishResult(null);
    setIsPublishTimeFieldTypeManual(false);
    setAIDrafts({});
    setAIDraftState(EMPTY_AI_DRAFT_STATE);
    setConfirmations({
      normalizationConfirmed: false,
      fieldsConfirmed: false,
      publishConfirmed: false
    });
    setErrorMessage("");
  }

  function applySourceType(nextSource: IngestionSourceType) {
    resetWorkspace(nextSource);
    setSourceType(nextSource);
    setSampleInput([SAMPLE_KAFKA_JSON]);
    setStep("detect");
  }

  async function runDetection() {
    if (sampleInput.length === 0) {
      setErrorMessage("请先准备样本数据");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const detected = await detectIngestionShape({ samples: sampleInput });
      setDetectionResult(detected);
      setNormalizationDraft({
        timePath: detected.timeCandidates[0]?.path ?? "",
        bodyPath: detected.bodyCandidates[0]?.path ?? "",
        tagPath: detected.tagCandidates[0]?.path ?? "",
        needNestedJson: Boolean(detected.nestedJsonCandidates[0]?.path),
        nestedJsonPath: detected.nestedJsonCandidates[0]?.path,
        requiresConfirm: true
      });
      setStep("normalize");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "样本识别失败");
    } finally {
      setLoading(false);
    }
  }

  function updateNormalizationDraft(patch: Partial<NormalizationDraft>) {
    setNormalizationDraft((current) =>
      current
        ? {
            ...current,
            ...patch,
            requiresConfirm: true
          }
        : null
    );
  }

  async function confirmNormalization() {
    if (!normalizationDraft) {
      setErrorMessage("缺少解析草案");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const fields = await listQueryableFields({
        samples: sampleInput,
        draft: normalizationDraft
      });
      setQueryableFields(fields);
      setConfirmations((current) => ({
        ...current,
        normalizationConfirmed: true
      }));
      setDefaultFields(fields.filter((item) => item.isScalar).slice(0, 4).map((item) => item.fieldKey));
      setStep("fields");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "字段目录生成失败");
    } finally {
      setLoading(false);
    }
  }

  function toggleDefaultField(fieldKey: string) {
    setDefaultFields((current) =>
      current.includes(fieldKey) ? current.filter((item) => item !== fieldKey) : [...current, fieldKey]
    );
  }

  function replaceDefaultFields(fieldKeys: string[]) {
    setDefaultFields(Array.from(new Set(fieldKeys)));
  }

  async function buildReviewDraft() {
    if (!sourceType || !normalizationDraft) {
      setErrorMessage("缺少发布草案上下文");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const payload: IngestionPublishDraftPayload = {
        sourceType,
        normalization: normalizationDraft,
        queryableFields,
        defaultFields
      };
      const draft = await buildPublishDraft(payload);
      setPublishDraft(draft);
      setPublishResult(null);
      setConfirmations((current) => ({
        ...current,
        fieldsConfirmed: true,
        publishConfirmed: false
      }));
      setStep("publish");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成发布草案失败");
    } finally {
      setLoading(false);
    }
  }

  function updatePublishTarget(patch: Partial<IngestionPublishTarget>) {
    setPublishTarget((current) => ({
      ...current,
      ...patch
    }));
  }

  function setPublishTimeFieldType(timeFieldType: number) {
    setIsPublishTimeFieldTypeManual(true);
    setPublishTarget((current) => ({
      ...current,
      timeFieldType
    }));
  }

  async function confirmPublishDraft() {
    if (!sourceType || !normalizationDraft || !publishDraft) {
      setErrorMessage("缺少发布草案上下文");
      return false;
    }
    if (!publishTarget.instanceId) {
      setErrorMessage("请选择发布实例");
      return false;
    }
    if (!publishTarget.databaseName.trim()) {
      setErrorMessage("请输入数据库名");
      return false;
    }
    if (!publishTarget.tableName.trim()) {
      setErrorMessage("请输入日志库名");
      return false;
    }
    if (!publishTarget.desc.trim()) {
      setErrorMessage("请输入接入描述");
      return false;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const payload: IngestionPublishRequest = {
        sourceType,
        normalization: normalizationDraft,
        queryableFields,
        defaultFields,
        target: {
          ...publishTarget,
          databaseName: publishTarget.databaseName.trim(),
          tableName: publishTarget.tableName.trim(),
          cluster: publishTarget.cluster?.trim() || undefined,
          desc: publishTarget.desc.trim()
        }
      };
      const result = await publishIngestion(payload);
      setPublishResult(result);
      setConfirmations((current) => ({
        ...current,
        publishConfirmed: true
      }));
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发布创建失败");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function applyAIDraft(kind: "detectionExplain" | "fieldRecommend" | "publishSummary", draft: AIDraftResponse) {
    setAIDrafts((current) => ({
      ...current,
      [kind]: draft
    }));
    setAIDraftState((current) => ({
      ...current,
      [kind]: {
        loading: false,
        errorMessage: ""
      }
    }));
  }

  function discardAIDraft(kind: "detectionExplain" | "fieldRecommend" | "publishSummary") {
    setAIDrafts((current) => ({
      ...current,
      [kind]: null
    }));
    setAIDraftState((current) => ({
      ...current,
      [kind]: {
        loading: false,
        errorMessage: ""
      }
    }));
  }

  async function generateAIDraft(kind: AIDraftKind) {
    setAIDraftState((current) => ({
      ...current,
      [kind]: {
        loading: true,
        errorMessage: ""
      }
    }));
    try {
      switch (kind) {
        case "detectionExplain": {
          if (!detectionResult) {
            throw new Error("缺少识别结果，无法生成解析草案");
          }
          const draft = await runQueryAIDraft<AIIngestionDetectExplainInput>({
            scenario: "query.ingestion.detect_explain",
            input: {
              result: detectionResult
            }
          });
          applyAIDraft(kind, draft);
          return;
        }
        case "fieldRecommend": {
          if (!queryableFields.length) {
            throw new Error("缺少字段目录，无法生成默认字段建议");
          }
          const draft = await runQueryAIDraft<AIIngestionFieldRecommendInput>({
            scenario: "query.ingestion.field_recommend",
            input: {
              fields: queryableFields
            }
          });
          applyAIDraft(kind, draft);
          return;
        }
        case "publishSummary": {
          if (!normalizationDraft || !publishDraft) {
            throw new Error("缺少发布上下文，无法生成发布摘要");
          }
          const draft = await runQueryAIDraft<AIIngestionPublishSummaryInput>({
            scenario: "query.ingestion.publish_summary",
            input: {
              normalization: normalizationDraft,
              fields: queryableFields,
              defaultFields,
              warnings: publishDraft.warnings ?? []
            }
          });
          applyAIDraft(kind, draft);
          return;
        }
      }
    } catch (error) {
      setAIDraftState((current) => ({
        ...current,
        [kind]: {
          loading: false,
          errorMessage: error instanceof Error ? error.message : "AI 草案生成失败"
        }
      }));
    }
  }

  return {
    steps: DEFAULT_STEPS,
    step,
    sourceType,
    sampleInput,
    detectionResult,
    normalizationDraft,
    queryableFields,
    defaultFields,
    publishDraft,
    publishTarget,
    publishResult,
    aiDrafts,
    aiDraftState,
    confirmations,
    loading,
    errorMessage,
    summary,
    setStep,
    setSampleInput,
    applySourceType,
    runDetection,
    updateNormalizationDraft,
    confirmNormalization,
    toggleDefaultField,
    replaceDefaultFields,
    buildReviewDraft,
    confirmPublishDraft,
    updatePublishTarget,
    setPublishTimeFieldType,
    generateAIDraft,
    applyAIDraft,
    discardAIDraft,
    resetWorkspace
  };
}
