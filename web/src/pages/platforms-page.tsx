import { useEffect, useState, type FormEvent } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlatformForm } from "@/features/platforms/platform-form"
import { PlatformList } from "@/features/platforms/platform-list"
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("platformsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("platformsDescription")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadPlatforms()}>
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("platformsAddButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("platformsCreateTitle")}</DialogTitle>
                <DialogDescription>{t("platformsCreateDescription")}</DialogDescription>
              </DialogHeader>

              <PlatformForm
                draft={draft}
                onSubmit={handleCreate}
                onDraftChange={setDraft}
                showKey={showCreateKey}
                onToggleShowKey={() => setShowCreateKey((current) => !current)}
                saving={saving}
                submitLabel={t("create")}
                t={t}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("platformsTitle")}</CardTitle>
          <CardDescription>{t("platformsDescription")}</CardDescription>
        </CardHeader>
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
