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
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border border-dashed rounded p-4 text-center transition ${
        dragOver ? 'border-ink bg-panel' : 'border-line'
      }`}
      data-testid="file-drop-zone"
    >
      <div className="text-[10px] text-dim mb-2">Drop .txt / .md / .csv / .pdf here</div>
      <label className="inline-flex items-center gap-2">
        <input type="file" accept=".txt,.md,.csv,.pdf" onChange={handleBrowse} className="hidden" data-testid="file-input" />
        <Button variant="outline" size="sm" className="border-line text-ink" disabled={ingesting}>
          {ingesting ? 'INGESTING...' : 'BROWSE'}
        </Button>
      </label>
    </div>
  )
}
