import { Folder, FolderTree } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TranslateFn } from "@/lib/i18n"

import { ALL_FOLDERS, ROOT_FOLDER, type FolderItem } from "./video-utils"

interface FolderExplorerProps {
  folderItems: FolderItem[]
  folderCounts: Record<string, number>
  selectedFolder: string
  onSelectFolder: (folder: string) => void
  t: TranslateFn
}

export function FolderExplorer({ folderItems, folderCounts, selectedFolder, onSelectFolder, t }: FolderExplorerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderTree className="h-4 w-4" />
          {t("videosFolderExplorer")}
        </CardTitle>
        <CardDescription>{t("videosFolderExplorerDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        <button
          type="button"
          className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
            selectedFolder === ALL_FOLDERS ? "bg-foreground text-background" : "bg-muted/50"
          }`}
          onClick={() => onSelectFolder(ALL_FOLDERS)}
        >
          <span className="inline-flex items-center gap-2">
            <Folder className="h-4 w-4" />
            {t("videosAllFolders")}
          </span>
          <span className="text-xs">{folderCounts[ALL_FOLDERS] ?? 0}</span>
        </button>

        <button
          type="button"
          className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
            selectedFolder === ROOT_FOLDER ? "bg-foreground text-background" : "bg-muted/50"
          }`}
          onClick={() => onSelectFolder(ROOT_FOLDER)}
        >
          <span className="inline-flex items-center gap-2">
            <Folder className="h-4 w-4" />
            {t("videosRootFolder")}
          </span>
          <span className="text-xs">{folderCounts[ROOT_FOLDER] ?? 0}</span>
        </button>

        {folderItems.length > 0 ? <div className="my-2 border-t border-border" /> : null}

        {folderItems.map((folder) => {
          const isActive = selectedFolder === folder.path
          return (
            <button
              key={folder.path}
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
                isActive ? "bg-foreground text-background" : "bg-muted/50"
              }`}
              style={{ paddingLeft: `${0.65 + folder.depth * 0.8}rem` }}
              onClick={() => onSelectFolder(folder.path)}
            >
              <span className="inline-flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {folder.label}
              </span>
              <span className="text-xs">{folderCounts[folder.path] ?? 0}</span>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
