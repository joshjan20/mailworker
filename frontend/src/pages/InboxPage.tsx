import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles, Upload } from 'lucide-react'
import { extractEmail, listSamples } from '../api/client'

export default function InboxPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rawText, setRawText] = useState('')
  const [senderEmail, setSenderEmail] = useState('')

  const { data: samples } = useQuery({ queryKey: ['samples'], queryFn: listSamples })

  const mutation = useMutation({
    mutationFn: () => extractEmail(rawText, senderEmail || undefined),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      navigate(`/emails/${record.id}`)
    },
  })

  function handleFile(file: File) {
    file.text().then(setRawText)
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h1 className="text-xl font-semibold text-[var(--text)]">Submit an Email</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Paste raw email text (or upload a .eml/.txt file) to run it through extraction.
      </p>

      {samples && samples.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
            Load a sample
          </div>
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <button
                key={s.label}
                onClick={() => setRawText(s.raw_text)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
            Raw email text
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
            <Upload size={13} />
            Upload file
            <input
              type="file"
              accept=".eml,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
        <textarea
          className="h-72 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-[13px] leading-relaxed text-[var(--text)] outline-none focus:border-[var(--accent)]"
          placeholder="From: shipper@example.com&#10;To: bookings@yourforwarder.com&#10;Subject: ...&#10;&#10;Email body..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
              Sender email (optional override)
            </label>
            <input
              className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              placeholder="sender@company.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
          </div>
          <button
            disabled={!rawText.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {mutation.isPending ? 'Extracting…' : 'Extract Shipment Details'}
          </button>
        </div>

        {mutation.isError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {(mutation.error as Error).message}
          </div>
        )}
      </div>
    </div>
  )
}
