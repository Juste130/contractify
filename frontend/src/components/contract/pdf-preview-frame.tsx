"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle, ExternalLink } from "lucide-react"

interface PdfPreviewFrameProps {
  url: string
  title: string
  className?: string
}

/**
 * Renders a PDF served from an external IPFS gateway inside an iframe — without ever
 * navigating the iframe directly to that external URL. A plain `<iframe src="https://
 * gateway...">` is a genuine cross-origin navigation, and a gateway is free to send
 * X-Frame-Options / CSP `frame-ancestors` headers refusing to be framed at all — Chrome then
 * shows its own "this content was blocked" page instead of the document, and no `sandbox`
 * value on our own iframe can do anything about a header the third-party gateway decided to
 * send (this is what kept happening even after adding `allow-downloads` for the separate,
 * unrelated Content-Disposition issue).
 *
 * Instead: fetch the file's bytes with plain `fetch()` — a same-origin-initiated request,
 * not a framed navigation, so anti-framing headers never come into play — and hand the
 * iframe a local `blob:` URL built from the response. If the fetch itself fails (CORS not
 * enabled on the gateway, network error, gateway down), fall back to a direct external link
 * rather than a silent blank block.
 */
export function PdfPreviewFrame({ url, title, className }: PdfPreviewFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setStatus("loading")
    setBlobUrl(null)

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (status === "loading") {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className || ""}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-gray-100 p-8 text-center ${className || ""}`}>
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          L'aperçu n'a pas pu être chargé directement ici. Le document reste accessible en l'ouvrant directement.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline inline-flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ouvrir le document
        </a>
      </div>
    )
  }

  return (
    // A local blob: URL, not a cross-origin navigation — no gateway framing headers to
    // fight, so a fully empty sandbox is both safe and sufficient here.
    <iframe src={blobUrl!} className={className} title={title} sandbox="" />
  )
}
