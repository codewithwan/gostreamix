import { useState } from "react"
import { cn } from "@/lib/utils"

interface SampleNotificationProps {
  t: (key: string, fallback?: string) => string
}

export function SampleNotification({ t }: SampleNotificationProps) {
  const [activePreview, setActivePreview] = useState<"discord" | "telegram">("discord")

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("settingsSampleNotificationTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("settingsSampleNotificationDescription")}</p>
        </div>
        <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">{t("settingsSampleTrigger")}</span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActivePreview("discord")}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-t-md border-b-2 -mb-[6px] transition-all",
            activePreview === "discord" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("settingsDiscord")} Preview
        </button>
        <button
          type="button"
          onClick={() => setActivePreview("telegram")}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-t-md border-b-2 -mb-[6px] transition-all",
            activePreview === "telegram" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("settingsTelegram")} Preview
        </button>
      </div>

      {activePreview === "discord" ? (
        /* Discord Preview Card */
        <div className="rounded-md bg-[#313338] text-[#dbdee1] p-4 font-sans text-sm border border-black/35 shadow-lg select-text">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-bold shrink-0 text-[18px]">
              G
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white hover:underline cursor-pointer">GoStreamix Bot</span>
                <span className="bg-[#5865f2] text-[9px] text-white font-bold px-1 py-0.2 rounded-sm uppercase tracking-wider">BOT</span>
                <span className="text-xs text-[#949ba4]">Today at 9:15 PM</span>
              </div>
              
              {/* Discord Embed */}
              <div className="mt-1.5 max-w-[500px] rounded-md border-l-[4px] border-[#f23f43] bg-[#2b2d31] p-3 sm:p-4 flex flex-col gap-2 shadow-[0_0_15px_rgba(242,63,67,0.08)] relative overflow-hidden">
                <div className="text-white font-semibold text-[15px] flex items-center gap-1.5">
                  🔴 Stream error detected
                </div>
                
                {/* Embed Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-[13px]">
                  <div>
                    <span className="block font-bold text-white uppercase text-[10px] tracking-wider text-[#949ba4]">Stream</span>
                    <span className="mt-0.5 block text-[#e3e5e8]">Main Live Broadcast</span>
                  </div>
                  <div>
                    <span className="block font-bold text-white uppercase text-[10px] tracking-wider text-[#949ba4]">Status</span>
                    <span className="mt-0.5 block flex items-center gap-1 text-[#e3e5e8]">
                      <span className="w-2 h-2 rounded-full bg-[#f23f43] animate-pulse" />
                      error
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block font-bold text-white uppercase text-[10px] tracking-wider text-[#949ba4]">Trigger</span>
                    <span className="mt-0.5 block bg-[#1e1f22] p-1.5 rounded font-mono text-xs text-[#e3e5e8] border border-black/25">FFmpeg exited unexpectedly</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block font-bold text-white uppercase text-[10px] tracking-wider text-[#949ba4]">Detail</span>
                    <span className="mt-0.5 block text-[#e3e5e8]">RTMP target rejected the connection. Check destination key or network.</span>
                  </div>
                </div>
                
                <div className="mt-2 text-[10px] text-[#949ba4] border-t border-[#35363c] pt-2 flex items-center justify-between">
                  <span>GoStreamix Studio</span>
                  <span>2026-06-08 21:15 WIB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Telegram Preview Card */
        <div className="rounded-md bg-[#0e1621] p-4 font-sans text-sm border border-black/35 shadow-lg flex justify-start select-text">
          <div className="max-w-[90%] sm:max-w-[460px] rounded-2xl bg-[#182533] text-[#f5f5f5] px-3.5 py-2.5 relative shadow-sm border border-[#202f3e] flex flex-col gap-1.5">
            <span className="font-semibold text-[#5288c1] text-[13px] hover:underline cursor-pointer">GoStreamix Bot</span>
            
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#e5edf5]">
              <strong>[GoStreamix] Stream error detected</strong>{"\n"}
              📺 <strong>Stream</strong>: <code className="bg-[#101921] px-1 rounded text-[#e0c068] font-mono text-xs border border-[#1b2733]">Main Live Broadcast</code>{"\n"}
              ⚠️ <strong>Trigger</strong>: <code className="bg-[#101921] px-1 rounded text-[#e0c068] font-mono text-xs border border-[#1b2733]">FFmpeg exited unexpectedly</code>{"\n"}
              ℹ️ <strong>Detail</strong>: RTMP target rejected the connection. Check destination key or network.{"\n"}
              🕒 <strong>Time</strong>: 2026-06-08 21:15 WIB
            </div>
            
            {/* Telegram ticks + time */}
            <div className="flex items-center gap-0.5 self-end mt-1 text-[10px] text-[#708499] select-none">
              <span>21:15</span>
              <svg className="w-3.5 h-3.5 fill-current text-[#5288c1]" viewBox="0 0 24 24">
                <path d="M0.41,12.41L1.83,11L8,17.17L22.17,3L23.59,4.41L8,20L0.41,12.41M8,14.34L14.34,8L15.76,9.41L8,17.17L3.41,12.59L4.83,11.17L8,14.34Z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
