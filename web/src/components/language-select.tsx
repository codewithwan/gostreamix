import { Globe } from "lucide-react"

interface LanguageSelectProps {
  lang: string
  setLang: (lang: "en" | "id") => void
  label?: string
}

/** Globe-prefixed language dropdown used on the auth screens. No flags — a
 *  neutral globe avoids implying a country for each language. */
export function LanguageSelect({ lang, setLang, label = "Language" }: LanguageSelectProps) {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2" title={label}>
      <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <select
        aria-label={label}
        className="bg-transparent text-xs focus:outline-none"
        value={lang}
        onChange={(event) => setLang(event.target.value as "en" | "id")}
      >
        <option value="en">EN</option>
        <option value="id">ID</option>
      </select>
    </div>
  )
}
