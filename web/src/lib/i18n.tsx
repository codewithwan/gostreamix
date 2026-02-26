import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { type Lang, messages } from "@/lib/i18n/messages"

export type TranslateParams = Record<string, string | number>
export type TranslateFn = (key: string, fallback?: string, params?: TranslateParams) => string

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslateFn
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = window.localStorage.getItem("gostreamix-lang")
    if (saved === "en" || saved === "id") {
      return saved
    }
    return "en"
  })

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang: (nextLang: Lang) => {
        window.localStorage.setItem("gostreamix-lang", nextLang)
        setLang(nextLang)
      },
      t: (key: string, fallback?: string, params?: TranslateParams) => {
        const message = messages[lang][key as keyof (typeof messages)["en"]] ?? fallback ?? key
        if (!params) {
          return message
        }

        return message.replace(/\{(\w+)\}/g, (_, token: string) => {
          const value = params[token]
          if (value === undefined || value === null) {
            return `{${token}}`
          }
          return String(value)
        })
      },
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}
