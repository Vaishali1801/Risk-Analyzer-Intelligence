"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a PDF or DOCX file." })
    .refine((file) => file.size > 0, "The selected file is empty.")
    .refine((file) => file.size <= 12 * 1024 * 1024, "Upload a contract under 12 MB.")
    .refine(
      (file) => {
        const name = file.name.toLowerCase();
        return name.endsWith(".pdf") || name.endsWith(".docx");
      },
      "Only PDF and DOCX files are supported."
    )
});

type UploadForm = z.infer<typeof uploadSchema>;

type UploadPanelProps = {
  onAnalyzeFile: (file: File) => Promise<void>;
  onAnalyzeText: (text: string) => Promise<void>;
  onDemo: () => Promise<void>;
  activeFlow?: "analyze" | "demo" | null;
  loading: boolean;
  demoHref?: string;
};

export function UploadPanel({
  onAnalyzeFile,
  onAnalyzeText,
  onDemo,
  activeFlow = null,
  loading,
  demoHref = "/api/demo/document"
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const form = useForm<UploadForm>({ resolver: zodResolver(uploadSchema) });
  const selectedFile = form.watch("file");
  const canAnalyze = mode === "upload" ? Boolean(selectedFile) : Boolean(pastedText.trim());
  const statusMessage =
    loading && activeFlow === "demo"
      ? "Preparing demo analysis..."
      : loading && mode === "upload"
        ? "Uploading and analyzing document..."
        : loading && mode === "paste"
          ? "Analyzing pasted content..."
          : null;

  function setFile(file?: File) {
    if (!file) return;
    setLocalError(null);
    form.setValue("file", file, { shouldValidate: true, shouldDirty: true });
  }

  async function submit() {
    setLocalError(null);

    if (mode === "upload") {
      const valid = await form.trigger("file");
      if (!valid) return;
      const file = form.getValues("file");
      if (!file) return;
      await onAnalyzeFile(file);
      return;
    }

    if (!pastedText.trim()) {
      setLocalError("Paste contract text before running the review.");
      return;
    }

    await onAnalyzeText(pastedText.trim());
  }

  return (
    <Card className="glass-panel overflow-hidden border-slate-200 shadow-md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-3 p-3.5"
      >
        <div
          className={cn(
            "rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 transition",
            mode === "upload" && isDragging && "border-slate-900 bg-blue-50/60",
            loading && "opacity-70"
          )}
        >
          <div className="mb-2.5 flex justify-center">
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/15 w-fit">
              <UploadCloud className="h-6 w-6" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-950">Upload document for AI risk review</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              {"Think every risk and its impact is covered? Run it through AI and see what you\u2019re missing."}
            </p>
          </div>

          <div className="mt-3 transition-opacity duration-200">
            {mode === "upload" ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  setFile(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex h-[96px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 text-center transition-all duration-200 hover:border-slate-400 hover:bg-slate-50/80",
                  isDragging && "border-slate-900 bg-blue-50/60",
                  loading && "pointer-events-none"
                )}
              >
                <Input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(event) => setFile(event.target.files?.[0])}
                />
                {selectedFile ? (
                  <div className="space-y-2 text-center">
                    <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 transition hover:text-slate-800 hover:underline"
                      disabled={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLocalError(null);
                        setMode("paste");
                      }}
                    >
                      {"Paste text instead \u2192"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700">
                      Upload or drag &amp; drop your file{" "}
                      <span className="font-normal text-slate-400">(PDF or DOCX)</span>
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:text-slate-800 hover:underline"
                      disabled={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLocalError(null);
                        setMode("paste");
                      }}
                    >
                      {"Paste text instead \u2192"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="transition-opacity duration-200">
                <Textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  placeholder={"Paste your contract, RFP, or any document text here\u2026"}
                  className="h-[102px] min-h-[102px] resize-none border-slate-200 bg-white/75"
                  disabled={loading}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">You can paste full documents or specific clauses</p>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 transition hover:text-slate-700 hover:underline"
                    disabled={loading}
                    onClick={() => {
                      setLocalError(null);
                      setMode("upload");
                    }}
                  >
                    {"\u2190 Upload file instead"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {mode === "upload" && form.formState.errors.file ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {form.formState.errors.file.message}
          </p>
        ) : null}

        {localError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:flex-nowrap">
          <div title={!canAnalyze && !loading ? "Upload or paste content to analyze" : undefined}>
            <Button
              type="submit"
              className="h-10 rounded-xl px-4 sm:basis-[31%] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              disabled={loading || !canAnalyze}
              title={!canAnalyze && !loading ? "Upload or paste content to analyze" : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <LoaderCircle
                  className={cn("h-4 w-4 shrink-0", loading && activeFlow === "analyze" ? "animate-spin opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
                <span>Analyze Risks</span>
              </span>
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl px-4 sm:basis-[28%]"
            onClick={() => {
              void onDemo();
            }}
            disabled={loading}
          >
            <span className="inline-flex items-center gap-2">
              <LoaderCircle
                className={cn("h-4 w-4 shrink-0", loading && activeFlow === "demo" ? "animate-spin opacity-100" : "opacity-0")}
                aria-hidden="true"
              />
              <span>Try Demo</span>
            </span>
          </Button>
          <a
            href={demoHref}
            target="_blank"
            rel="noreferrer"
            aria-disabled={loading}
            className={cn(
              "inline-flex items-center text-sm font-normal text-red-500 transition-colors duration-200 hover:text-red-600 hover:underline",
              loading && "pointer-events-none opacity-50"
            )}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            View demo doc
            <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </div>

        <div aria-live="polite" className="min-h-[1.25rem] text-center">
          {statusMessage ? <p className="text-sm font-medium text-slate-500">{statusMessage}</p> : null}
        </div>
      </form>
    </Card>
  );
}
