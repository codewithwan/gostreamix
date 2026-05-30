export const ALL_FOLDERS = "__all__"
export const ROOT_FOLDER = ""

export interface FolderItem {
  path: string
  depth: number
  label: string
}

export interface FolderTile {
  path: string
  label: string
  childCount: number
  videoCount: number
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

export function folderName(path: string) {
  if (path === ROOT_FOLDER) {
    return "Root"
  }
  return folderLeafName(path)
}

export function parentFolder(path: string) {
  const clean = normalizeFolder(path)
  if (!clean) {
    return ROOT_FOLDER
  }
  const parts = clean.split("/")
  parts.pop()
  return parts.join("/")
}

export function childFolders(folderOptions: string[], currentFolder: string, folderCounts: Record<string, number>): FolderTile[] {
  const current = normalizeFolder(currentFolder)
  const seen = new Set<string>()

  for (const rawFolder of folderOptions) {
    const folder = normalizeFolder(rawFolder)
    if (!folder || folder === ALL_FOLDERS) {
      continue
    }

    const parts = folder.split("/")
    const child = current ? parts.slice(0, current.split("/").length + 1).join("/") : parts[0]
    const belongsToCurrent = current ? folder === current || folder.startsWith(`${current}/`) : true
    if (!belongsToCurrent || child === current) {
      continue
    }
    seen.add(child)
  }

  return Array.from(seen)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      path,
      label: folderLeafName(path),
      childCount: Array.from(seen).filter((item) => parentFolder(item) === path).length,
      videoCount: folderCounts[path] ?? 0,
    }))
}

export function breadcrumbFolders(currentFolder: string) {
  const clean = normalizeFolder(currentFolder)
  if (!clean) {
    return [{ path: ROOT_FOLDER, label: "Root" }]
  }

  const parts = clean.split("/")
  return [
    { path: ROOT_FOLDER, label: "Root" },
    ...parts.map((_, index) => {
      const path = parts.slice(0, index + 1).join("/")
      return { path, label: folderLeafName(path) }
    }),
  ]
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
