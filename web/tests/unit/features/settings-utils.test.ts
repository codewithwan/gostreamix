import { describe, expect, it } from "vitest"

import { emptySettings, hostFromURL, maskText } from "@/features/settings/settings-utils"

describe("settings masks", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    ["ab", "ab***"],
    ["abcdef", "ab***"],
    ["abcdefghij", "ab***"],
    ["abcdefghijk", "abcd***hijk"],
    [" 12345678901 ", "1234***8901"],
    ["telegram-token-secret", "tele***cret"],
  ])("masks %q", (value, expected) => {
    expect(maskText(value)).toBe(expected)
  })
})

describe("settings URL hosts", () => {
  it.each([
    ["", ""],
    ["https://discord.com/api/webhooks/1/token", "discord.com"],
    ["https://example.com:8443/path", "example.com:8443"],
    ["http://localhost:3000/test", "localhost:3000"],
    ["not a url", "no***"],
    [" secret-token-value ", "secr***alue"],
  ])("extracts or masks host from %q", (value, expected) => {
    expect(hostFromURL(value)).toBe(expected)
  })

  it("keeps empty settings blank", () => {
    expect(emptySettings).toEqual({ discord_webhook: "", telegram_bot_token: "", telegram_chat_id: "" })
  })
})
