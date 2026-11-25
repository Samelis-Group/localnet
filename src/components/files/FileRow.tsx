import { memo } from 'react'
import { Download, FileText, MoreHorizontal, Share2, Star } from 'lucide-react'
import { categoryColor, fileExtension, formatBytes, formatDate } from '../../lib/format'
import type { LibraryFile } from '../../lib/types'
import { Badge } from '../ui'
import { IconButton } from './primitives'

export function FileIcon({ file, size = 38 }: { file: LibraryFile; size?: number }) {
  const color = categoryColor(file.category)
  return (
    <span className="file-icon" style={{ width: size, height: size, color, background: `${color}1f`, fontSize: size > 38 ? 11 : 9 }}>
      <FileText size={size > 38 ? 20 : 17} />
    </span>
  )
}

export const FileRow = memo(function FileRow({ file, ownerName, onPreview, onDownload, onShare, onStar, onMenu }: {
  file: LibraryFile
  ownerName: string
  onPreview: (file: LibraryFile) => void
  onDownload: (file: LibraryFile) => void
  onShare: (file: LibraryFile) => void
  onStar: (file: LibraryFile) => void
  onMenu?: (file: LibraryFile) => void
}) {
  return (
    <div className="file-row">
      <FileIcon file={file} />
      <div className="grow" style={{ cursor: 'pointer' }} onClick={() => onPreview(file)}>
        <div className="row" style={{ gap: 7 }}>
          <span className="file-name truncate">{file.name}</span>
          {file.starred && <Star size={12} fill="var(--warn)" color="var(--warn)" />}
          {!file.canDownload && <Badge tone="warn">Privé</Badge>}
        </div>
        <div className="file-meta truncate">{ownerName} · {file.folder} · {formatDate(file.createdAt)}</div>
      </div>
      <div className="small muted">{formatBytes(file.size)}</div>
      <div className="tiny faint">{file.downloads} téléch.</div>
      <div className="tiny faint hidden-mobile">{fileExtension(file.name)}</div>
      <div className="row" style={{ gap: 2 }}>
        <IconButton label="Aperçu" onClick={() => onPreview(file)}><FileText size={14} /></IconButton>
        <IconButton label="Télécharger" onClick={() => onDownload(file)}><Download size={14} /></IconButton>
        <IconButton label="Partager" onClick={() => onShare(file)}><Share2 size={14} /></IconButton>
        <IconButton label="Plus" onClick={() => (onMenu ? onMenu(file) : onStar(file))}><MoreHorizontal size={14} /></IconButton>
      </div>
    </div>
  )
})
