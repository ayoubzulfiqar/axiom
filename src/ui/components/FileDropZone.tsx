import { useCallback, useState } from 'react'
import { ingestFile } from '../../engine/client'
import { Button } from './ui/button'

export function FileDropZone() {
  const [dragOver, setDragOver] = useState(false)
  const [ingesting, setIngesting] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setIngesting(true)
    try {
      const text = await file.text()
      await ingestFile(file.name, text)
    } catch (err) {
      console.error('ingest failed', err)
    } finally {
      setIngesting(false)
    }
  }, [])

  const handleBrowse = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIngesting(true)
    try {
      const text = await file.text()
      await ingestFile(file.name, text)
    } catch (err) {
      console.error('ingest failed', err)
    } finally {
      setIngesting(false)
    }
  }, [])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
        dragOver ? 'border-foreground bg-accent' : 'border-border'
      }`}
      data-testid="file-drop-zone"
    >
      <div className="mb-2 text-[11px] text-muted-foreground">
        Drop .txt / .md / .csv / .pdf to ingest into the mesh
      </div>
      <label className="inline-flex items-center gap-2">
        <input
          type="file"
          accept=".txt,.md,.csv,.pdf"
          onChange={handleBrowse}
          className="hidden"
          data-testid="file-input"
        />
        <Button variant="outline" size="sm" className="border-border" disabled={ingesting}>
          {ingesting ? 'Ingesting…' : 'Browse'}
        </Button>
      </label>
    </div>
  )
}
