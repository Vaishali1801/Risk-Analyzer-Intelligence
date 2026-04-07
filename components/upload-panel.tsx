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
};

export function UploadPanel({ onAnalyze, onDemo, loading }: UploadPanelProps) {
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
    <Card className="glass-panel overflow-hidden border-slate-200 shadow-glow">
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5 p-6">
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
            "group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center transition",
            isDragging && "border-slate-950 bg-slate-50",
            loading && "pointer-events-none opacity-70"
          )}
        >
          <div className="mb-5 rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/20">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-slate-950">Upload contract for AI risk review</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Drag and drop a PDF or DOCX. The system extracts text, chunks long documents, validates JSON output, and
            applies deterministic decision logic.
          </p>
          <Input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          {selectedFile ? (
            <div className="mt-6 flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700">
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Contract"}
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onDemo} disabled={loading}>
            Try Demo Contract
          </Button>
        </div>
      </form>
    </Card>
  );
}
