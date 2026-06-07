import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { EditorHeader } from "@/features/stream-editor/stream-editor-header"
import { MonitorDialog, SettingsDialog, TargetsDialog } from "@/features/stream-editor/stream-editor-dialogs"
import { MediaLibraryPanel } from "@/features/stream-editor/stream-editor-media-library"
import { ProgramSaveDialog } from "@/features/stream-editor/program-save-dialog"
import { PreviewPlayer } from "@/features/stream-editor/stream-editor-preview-player"
import { TimelineStrip } from "@/features/stream-editor/stream-editor-timeline-strip"
import { useStreamEditor } from "@/features/stream-editor/stream-editor-use-page"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function StreamEditorPage() {
  const navigate = useNavigate()
  const { streamID = "" } = useParams()
  const { t } = useI18n()
  const editor = useStreamEditor({ streamID, t })
  const dragToken = useRef("")
  const [mobileTab, setMobileTab] = useState<"library" | "timeline">("timeline")
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [targetsOpen, setTargetsOpen] = useState(false)
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)

  const selectClip = (videoID: string, index: number) => {
    editor.setSelectedVideoID(videoID)
    editor.setActiveIndex(index)
    editor.setCurrentTime(0)
  }

  const duplicateClip = (index: number) => {
    const videoID = editor.timeline[index]
    if (!videoID) return
    editor.setTimeline((current) => [...current.slice(0, index + 1), videoID, ...current.slice(index + 1)])
  }

  const handleDrop = (index: number | null) => {
    const token = dragToken.current
    dragToken.current = ""
    if (!token) return
    if (token.startsWith("library:")) {
      editor.addToTimeline(token.replace("library:", ""))
      return
    }
    if (token.startsWith("timeline:") && index !== null) {
      const fromIndex = Number(token.replace("timeline:", ""))
      if (!Number.isFinite(fromIndex) || fromIndex === index) return
      editor.setTimeline((current) => {
        const next = [...current]
        const [item] = next.splice(fromIndex, 1)
        next.splice(index, 0, item)
        return next
      })
    }
  }

  const nextOnEnd = () => {
    const nextIndex = editor.activeIndex + 1
    if (nextIndex >= 0 && nextIndex < editor.timeline.length) {
      editor.setActiveIndex(nextIndex)
      editor.setSelectedVideoID(editor.timeline[nextIndex])
      editor.setCurrentTime(0)
      return
    }
    editor.setPlaying(false)
    editor.setActiveIndex(-1)
  }

  const handleSave = () => {
    if (editor.name.trim() && editor.targets.length > 0) {
      void editor.saveProgram(false)
    } else {
      setSaveOpen(true)
    }
  }

  const transform = editor.transforms[editor.activeIndex] || editor.defaultTransform

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <EditorHeader name={editor.name} status={editor.status} dirty={editor.dirty} isLive={editor.isLive} saving={editor.saving} onBack={() => navigate("/streams")} onToggleLibrary={() => setLibraryOpen((open) => !open)} onOpenSettings={() => setSettingsOpen(true)} onOpenTargets={() => setTargetsOpen(true)} onOpenMonitor={() => setMonitorOpen(true)} onOpenSave={handleSave} t={t} />
      {editor.error ? <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between shrink-0"><span className="truncate mr-4">{editor.error}</span><Button variant="subtle" size="sm" onClick={() => editor.setError("")} className="h-7 text-[10px] px-2">Dismiss</Button></div> : null}
      {editor.loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t("streamEditorLoading")}</div>
      ) : (
        <form className="flex-1 flex flex-col lg:flex-row overflow-hidden" onSubmit={(event) => event.preventDefault()}>
          <div className="grid grid-cols-2 gap-1 border-b border-border bg-muted/30 p-1 lg:hidden shrink-0">
            {(["library", "timeline"] as const).map((tab) => <button type="button" key={tab} onClick={() => setMobileTab(tab)} className={cn("rounded py-1.5 text-xs font-medium transition", mobileTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t(tab === "library" ? "streamEditorLibrary" : "streamEditorTimeline")}</button>)}
          </div>
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <div className={cn("w-full lg:w-80 shrink-0 overflow-hidden", mobileTab === "library" ? "flex" : libraryOpen ? "hidden lg:flex" : "hidden")}>
              <MediaLibraryPanel videos={editor.filteredVideos} folders={editor.folders} search={editor.search} folderFilter={editor.folderFilter} onSearchChange={editor.setSearch} onFolderFilterChange={editor.setFolderFilter} onAddVideo={editor.addToTimeline} onDragStart={(token) => { dragToken.current = token }} t={t} />
            </div>
            <div className={cn("flex-1 flex flex-col overflow-hidden min-w-0 bg-muted/5", mobileTab === "timeline" ? "flex" : "hidden lg:flex")}>
              <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-4 min-h-0 relative">
                <PreviewPlayer videoRef={editor.videoRef} selectedVideo={editor.selectedVideo} activeIndex={editor.activeIndex} transform={transform} playing={editor.playing} muted={editor.muted} currentTime={editor.currentTime} duration={editor.duration} onPlayingChange={editor.setPlaying} onMutedChange={editor.setMuted} onCurrentTimeChange={editor.setCurrentTime} onDurationChange={editor.setDuration} onEnded={nextOnEnd} t={t} />
              </div>
              <TimelineStrip videos={editor.timelineVideos} activeIndex={editor.activeIndex} selectedVideoID={editor.selectedVideoID} currentTime={editor.currentTime} duration={editor.duration} totalDuration={editor.totalDuration} onSelect={selectClip} onRemove={editor.removeFromTimeline} onMove={editor.moveClip} onDuplicate={duplicateClip} onDragStart={(token) => { dragToken.current = token }} onDrop={handleDrop} t={t} />
            </div>
          </div>
        </form>
      )}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} name={editor.name} bitrate={editor.bitrate} resolution={editor.resolution} fps={editor.fps} onNameChange={editor.setName} onBitrateChange={editor.setBitrate} onResolutionChange={editor.setResolution} onFpsChange={editor.setFps} t={t} />
      <TargetsDialog open={targetsOpen} onOpenChange={setTargetsOpen} targets={editor.targets} platforms={editor.platforms} draft={editor.targetDraft} onDraftChange={editor.setTargetDraft} onAddTarget={editor.addTarget} onRemoveTarget={(target) => editor.setTargets((current) => current.filter((item) => item !== target))} t={t} />
      <MonitorDialog open={monitorOpen} onOpenChange={setMonitorOpen} status={editor.status} stats={editor.stats} onActivity={() => navigate("/settings?tab=activity")} t={t} />
      <ProgramSaveDialog open={saveOpen} onOpenChange={setSaveOpen} name={editor.name} bitrate={editor.bitrate} resolution={editor.resolution} fps={editor.fps} targets={editor.targets} platforms={editor.platforms} saving={editor.saving} onNameChange={editor.setName} onBitrateChange={editor.setBitrate} onResolutionChange={editor.setResolution} onFpsChange={editor.setFps} onSetTargets={editor.setTargets} onSave={() => editor.saveProgram(false)} t={t} />
    </div>
  )
}
