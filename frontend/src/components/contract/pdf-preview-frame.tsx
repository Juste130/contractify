"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle, ExternalLink } from "lucide-react"

interface PdfPreviewFrameProps {
  url: string
  title: string
  className?: string
  /** Where the "open the document" fallback link points if the fetch fails — the direct
   *  external gateway URL, since that link is a real cross-origin navigation the user
   *  triggers by choice, not something this component fetches itself. Defaults to `url`. */
  fallbackUrl?: string
}

/**
 * Renders a PDF inside an iframe by fetching it first and handing the iframe a local `blob:`
 * URL, rather than pointing the iframe's `src` straight at wherever `url` actually lives.
 *
 * `url` is expected to be this app's own `/api/ipfs/proxy/:cid` endpoint (see
 * `ipfsApi.getProxyUrl`) — same origin, authenticated, and its response headers are fully
 * ours to control. Fetching (rather than a direct `<iframe src>`) is still worth doing even
 * for a same-origin URL: it lets the failure case be an explicit, actionable fallback link
 * instead of a silently blank iframe. It also means this component keeps working unchanged
 * if `url` ever pointed at a genuinely external gateway again — a plain `<iframe src="https://
 * gateway...">` is a real cross-origin navigation, and a gateway is free to send
 * X-Frame-Options/CSP `frame-ancestors` headers refusing to be framed at all (Chrome's own
 * "this content was blocked" page, which no `sandbox` value can override) — a risk `fetch()`
 * itself never carries, since it isn't a framed navigation.
 */
export function PdfPreviewFrame({ url, title, className, fallbackUrl }: PdfPreviewFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setStatus("loading")
    setBlobUrl(null)

    // `credentials: "include"`: the proxy endpoint is authenticated (httpOnly session
    // cookie) — without this, a cross-origin fetch to the API sends no cookie at all and
    // every request would 401.
    fetch(url, { credentials: "include" })
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
          href={fallbackUrl || url}
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
