"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  onAnalyze: (file: File) => Promise<void>;
  onDemo: () => void;
  loading: boolean;
  demoLoading?: boolean;
  demoHref?: string;
};

export function UploadPanel({
  onAnalyze,
  onDemo,
  loading,
  demoLoading = false,
  demoHref = "/sample-contract.pdf"
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const form = useForm<UploadForm>({ resolver: zodResolver(uploadSchema) });
  const selectedFile = form.watch("file");

  function setFile(file?: File) {
    if (!file) return;
    form.setValue("file", file, { shouldValidate: true, shouldDirty: true });
  }

  async function submit(values: UploadForm) {
    await onAnalyze(values.file);
  }

  return (
    <Card className="glass-panel overflow-hidden border-slate-200 shadow-md">
      <form onSubmit={form.handleSubmit(submit)} className="space-y-3 p-3.5">
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
            "group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center transition",
            isDragging && "border-slate-900 bg-blue-50/60",
            (loading || demoLoading) && "pointer-events-none opacity-70"
          )}
        >
          <div className="mb-3 rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/15">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-950">Upload document for AI risk review</h3>
          <p className="mt-1 max-w-md text-sm leading-5 text-slate-600">
            Drop a PDF or DOCX to generate a structured risk review, clause-level insights, and a decision recommendation.
          </p>
          <Input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          {selectedFile ? (
            <div className="mt-3 flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <FileText className="h-4 w-4" />
              {selectedFile.name}
            </div>
          ) : null}
        </div>

        {form.formState.errors.file ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {form.formState.errors.file.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="w-full sm:flex-1" disabled={loading || demoLoading}>
            {loading ? "Analyzing..." : "Analyze Risks"}
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={onDemo} disabled={loading || demoLoading}>
            {demoLoading ? "Reviewing demo..." : "Try Demo Contract"}
          </Button>
        </div>

        <a
          href={demoHref}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-medium text-red-600 transition hover:text-red-700 hover:underline"
        >
          View demo contract
        </a>
      </form>
    </Card>
  );
}
