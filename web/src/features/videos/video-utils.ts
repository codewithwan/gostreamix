export const ALL_FOLDERS = "__all__"
export const ROOT_FOLDER = ""

export interface FolderItem {
  path: string
  depth: number
  label: string
}

export function bytesLabel(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function normalizeFolder(raw: string) {
  const normalized = raw.trim().replaceAll("\\", "/")
  return normalized.replace(/^\/+/g, "").replace(/\/+$/g, "")
}

function folderLeafName(path: string) {
  const parts = path.split("/")
  return parts[parts.length - 1] || path
}

export function toFolderItems(folderOptions: string[]): FolderItem[] {
  return folderOptions
    .filter((folder) => folder !== ALL_FOLDERS && folder !== ROOT_FOLDER)
    .map((folder) => ({
      path: folder,
      depth: Math.max(0, folder.split("/").length - 1),
      label: folderLeafName(folder),
    }))
}
