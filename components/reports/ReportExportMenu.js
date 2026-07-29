'use client'

import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function ReportExportMenu({ onExportCsv, onExportPdf }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={onExportCsv} className="gap-2 text-[13px]">
          <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPdf} className="gap-2 text-[13px]">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
