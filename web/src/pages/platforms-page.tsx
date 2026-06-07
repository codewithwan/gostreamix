import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlatformForm } from "@/features/platforms/platform-form"
import { PlatformList } from "@/features/platforms/platform-list"
import { PlatformsPageHeader } from "@/features/platforms/platforms-page-header"
import { createEmptyPlatformDraft, type PlatformDraft } from "@/features/platforms/platform-utils"
import { createPlatform, getPlatforms, removePlatform, updatePlatform, type Platform } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export function PlatformsPage() {
  const { t } = useI18n()

  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [showEditKey, setShowEditKey] = useState(false)

  const [draft, setDraft] = useState<PlatformDraft>(createEmptyPlatformDraft)
  const [editingID, setEditingID] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadPlatforms = async () => {
    try {
      const data = await getPlatforms()
      setPlatforms(data)
      setError("")
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformsLoadFailed")
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadPlatforms()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }

  useEffect(() => {
    void loadPlatforms()
  }, [])

  const openCreate = () => {
    setDraft(createEmptyPlatformDraft())
    setShowCreateKey(false)
    setCreateOpen(true)
  }

  const openEdit = (platform: Platform) => {
    setEditingID(platform.id)
    setDraft({
      name: platform.name,
      platform_type: platform.platform_type,
      stream_key: platform.stream_key,
      custom_url: platform.custom_url,
    })
    setShowEditKey(false)
    setEditOpen(true)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      await createPlatform(draft)
      setCreateOpen(false)
      await loadPlatforms()
      toast.success(t("platformsCreateSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformsCreateFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      await updatePlatform(editingID, draft)
      setEditOpen(false)
      await loadPlatforms()
      toast.success(t("platformsUpdateSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformsUpdateFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (platformID: string, platformName: string) => {
    const ok = window.confirm(t("platformsDeleteConfirm", "Delete platform {name}?", { name: platformName }))
    if (!ok) {
      return
    }

    try {
      await removePlatform(platformID)
      await loadPlatforms()
      toast.success(t("platformsDeleteSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformsDeleteFailed")
      setError(message)
      toast.error(message)
    }
  }

  return (
    <section className="space-y-5">
      <PlatformsPageHeader
        createOpen={createOpen}
        draft={draft}
        isRefreshing={isRefreshing}
        loading={loading} saving={saving}
        showCreateKey={showCreateKey}
        onCreateOpenChange={setCreateOpen}
        onOpenCreate={openCreate}
        onRefresh={() =>
          void handleRefresh()}
        onDraftChange={setDraft}
        onSubmit={handleCreate}
        onToggleShowKey={() => setShowCreateKey((current) => !current)}
        t={t} />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Card className="pt-6">
        <CardContent className="overflow-x-auto">
          <PlatformList loading={loading} platforms={platforms} onEdit={openEdit} onDelete={handleDelete} t={t} />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("platformsEditTitle")}</DialogTitle>
            <DialogDescription>{t("platformsEditDescription")}</DialogDescription>
          </DialogHeader>

          <PlatformForm
            draft={draft}
            onSubmit={handleUpdate}
            onDraftChange={setDraft}
            showKey={showEditKey}
            onToggleShowKey={() => setShowEditKey((current) => !current)}
            saving={saving}
            submitLabel={t("update")}
            t={t}
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}
