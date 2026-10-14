'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { EMAIL_IMPORT_ACCEPT, readEmailImportFile } from '../emailFileImport'

/** Upload an .html / .htm / .txt file as the template's email HTML. */
export default function EmailFileUploadButton({
  hasContent = false,
  onImport,
  label = 'Upload file',
  variant = 'outline',
  className,
  iconClassName = 'h-3.5 w-3.5 sm:mr-1.5',
  labelClassName = 'hidden sm:inline',
}) {
  const toast = useToast()
  const inputRef = useRef(null)

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const { kind, html } = await readEmailImportFile(file)
      if (hasContent && !window.confirm(`Replace the current email content with "${file.name}"?`)) {
        return
      }
      onImport?.(html, kind)
      toast.success({
        title: 'File imported',
        message:
          kind === 'html'
            ? `Loaded HTML from ${file.name}.`
            : `Converted ${file.name} to email HTML.`,
      })
    } catch (err) {
      toast.error({ title: 'Import failed', message: err?.message || 'Could not read the file.' })
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={EMAIL_IMPORT_ACCEPT}
        onChange={importFile}
        className="hidden"
      />
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => inputRef.current?.click()}
        className={className}
        title="Upload an .html, .htm or .txt file"
      >
        <Upload className={iconClassName} />
        <span className={labelClassName}>{label}</span>
      </Button>
    </>
  )
}
