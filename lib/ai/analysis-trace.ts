export type TraceStageStatus = "success" | "warning" | "failed" | "skipped";

export type AnalysisTraceStage = {
  name: string;
  status: TraceStageStatus;
  startedAt: string;
  durationMs: number;
  quality?: Record<string, number | string | boolean | string[]>;
  warnings?: string[];
  errors?: string[];
};

export type AnalysisTrace = {
  runId: string;
  totalDurationMs: number;
  stages: AnalysisTraceStage[];
};

type MutableAnalysisTrace = AnalysisTrace & {
  startedAtMs?: number;
};

export type TraceStageHandle = {
  trace: MutableAnalysisTrace;
  name: string;
  startedAt: string;
  startedAtMs: number;
  ended: boolean;
};

type TraceQualityValue = number | string | boolean | string[] | undefined | null;
type TraceQualityInput = Record<string, TraceQualityValue>;

const MAX_STRING_LENGTH = 160;
const MAX_ARRAY_ITEMS = 8;
const MAX_STAGES = 32;

export function createAnalysisTrace(runId: string): AnalysisTrace {
  return {
    runId,
    totalDurationMs: 0,
    stages: [],
    startedAtMs: nowMs()
  } as MutableAnalysisTrace;
}

export function startTraceStage(trace: AnalysisTrace, name: string): TraceStageHandle {
  try {
    return {
      trace: trace as MutableAnalysisTrace,
      name: sanitizeLabel(name) || "unknown_stage",
      startedAt: new Date().toISOString(),
      startedAtMs: nowMs(),
      ended: false
    };
  } catch {
    return {
      trace: trace as MutableAnalysisTrace,
      name: "trace_stage_error",
      startedAt: new Date().toISOString(),
      startedAtMs: nowMs(),
      ended: false
    };
  }
}

export function endTraceStage(
  stageHandle: TraceStageHandle,
  status: TraceStageStatus,
  quality?: TraceQualityInput,
  warnings?: string[],
  errors?: string[]
): void {
  try {
    if (stageHandle.ended) return;
    stageHandle.ended = true;
    if (stageHandle.trace.stages.length >= MAX_STAGES) return;

    const stage: AnalysisTraceStage = {
      name: stageHandle.name,
      status,
      startedAt: stageHandle.startedAt,
      durationMs: Math.max(0, Number((nowMs() - stageHandle.startedAtMs).toFixed(2)))
    };
    const sanitizedQuality = sanitizeQuality(quality);
    const sanitizedWarnings = sanitizeStringArray(warnings);
    const sanitizedErrors = sanitizeStringArray(errors);

    if (sanitizedQuality) stage.quality = sanitizedQuality;
    if (sanitizedWarnings.length) stage.warnings = sanitizedWarnings;
    if (sanitizedErrors.length) stage.errors = sanitizedErrors;

    stageHandle.trace.stages.push(stage);
  } catch {
    // Tracing must never affect analysis execution.
  }
}

export function safeTraceStage<T>(
  trace: AnalysisTrace,
  name: string,
  fn: () => T,
  qualityMapper?: (value: Awaited<T>) => TraceQualityInput
): T {
  const stage = startTraceStage(trace, name);

  try {
    const value = fn();

    if (isPromiseLike(value)) {
      return value.then(
        (resolvedValue) => {
          endTraceStage(stage, "success", safelyMapQuality(qualityMapper, resolvedValue as Awaited<T>));
          return resolvedValue;
        },
        (error) => {
          endTraceStage(stage, "failed", undefined, undefined, [getErrorCode(error)]);
          throw error;
        }
      ) as T;
    }

    endTraceStage(stage, "success", safelyMapQuality(qualityMapper, value as Awaited<T>));
    return value;
  } catch (error) {
    endTraceStage(stage, "failed", undefined, undefined, [getErrorCode(error)]);
    throw error;
  }
}

export function finalizeAnalysisTrace(trace: AnalysisTrace): AnalysisTrace {
  try {
    const mutableTrace = trace as MutableAnalysisTrace;
    const startedAtMs = mutableTrace.startedAtMs ?? nowMs();

    mutableTrace.totalDurationMs = Math.max(0, Number((nowMs() - startedAtMs).toFixed(2)));
    delete mutableTrace.startedAtMs;

    return mutableTrace;
  } catch {
    return {
      runId: trace.runId,
      totalDurationMs: 0,
      stages: trace.stages ?? []
    };
  }
}

function safelyMapQuality<T>(qualityMapper: ((value: T) => TraceQualityInput) | undefined, value: T) {
  try {
    return qualityMapper?.(value);
  } catch {
    return { qualityMapperFailed: true };
  }
}

function sanitizeQuality(quality?: TraceQualityInput): AnalysisTraceStage["quality"] | undefined {
  if (!quality) return undefined;

  const entries = Object.entries(quality)
    .map(([key, value]) => [sanitizeLabel(key), sanitizeQualityValue(value)] as const)
    .filter((entry): entry is readonly [string, number | string | boolean | string[]] => Boolean(entry[0]) && typeof entry[1] !== "undefined");

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function sanitizeQualityValue(value: TraceQualityValue): number | string | boolean | string[] | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return sanitizeStringArray(value);
  return undefined;
}

function sanitizeStringArray(values?: string[]) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => sanitizeText(value))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function sanitizeLabel(value: string) {
  return sanitizeText(value)
    .replace(/[^A-Za-z0-9_.:-]+/g, "_")
    .slice(0, 80);
}

function sanitizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_STRING_LENGTH);
}

function getErrorCode(error: unknown) {
  if (error instanceof Error) {
    return sanitizeLabel(error.name || "error");
  }

  return "unknown_error";
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function isPromiseLike<T>(value: T): value is T & Promise<Awaited<T>> {
  return Boolean(value && typeof (value as { then?: unknown }).then === "function");
}
