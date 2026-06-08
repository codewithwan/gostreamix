import { describe, expect, it } from "vitest"

import { ALL_FOLDERS, ROOT_FOLDER, breadcrumbFolders, bytesLabel, childFolders, folderName, normalizeFolder, parentFolder, toFolderItems } from "@/features/videos/video-utils"

describe("video utility formatting", () => {
  it.each([
    [0, "0 B"],
    [1, "1 B"],
    [512, "512 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [1024 * 1024 - 1, "1024.0 KB"],
    [1024 * 1024, "1.0 MB"],
    [5.5 * 1024 * 1024, "5.5 MB"],
    [1024 * 1024 * 1024 - 1, "1024.0 MB"],
    [1024 * 1024 * 1024, "1.00 GB"],
    [2.25 * 1024 * 1024 * 1024, "2.25 GB"],
  ])("formats %s bytes as %s", (bytes, expected) => {
    expect(bytesLabel(bytes)).toBe(expected)
  })
})

describe("folder normalization", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    ["clips", "clips"],
    [" clips ", "clips"],
    ["/clips", "clips"],
    ["clips/", "clips"],
    ["/clips/", "clips"],
    ["//clips//", "clips"],
    ["clips\\today", "clips/today"],
    ["\\clips\\today\\", "clips/today"],
    ["clips//today", "clips//today"],
    [" clips/today ", "clips/today"],
    ["clips/today/session", "clips/today/session"],
    ["///clips/today/session///", "clips/today/session"],
    ["a\\b/c\\d", "a/b/c/d"],
  ])("normalizes %q to %q", (raw, expected) => {
    expect(normalizeFolder(raw)).toBe(expected)
  })

  it.each([
    [ROOT_FOLDER, "Root"],
    ["clips", "clips"],
    ["clips/today", "today"],
    ["clips/today/session", "session"],
    ["a/b/c/d", "d"],
    ["folder/", "folder/"],
  ])("gets folder name for %q", (path, expected) => {
    expect(folderName(path)).toBe(expected)
  })

  it.each([
    ["", ""],
    ["clips", ""],
    ["clips/today", "clips"],
    ["clips/today/session", "clips/today"],
    ["/clips/today/", "clips"],
    ["clips\\today\\session", "clips/today"],
    ["a/b/c/d", "a/b/c"],
    [" a/b ", "a"],
  ])("gets parent folder for %q", (path, expected) => {
    expect(parentFolder(path)).toBe(expected)
  })
})

describe("folder collections", () => {
  it("builds child folders at root level", () => {
    expect(childFolders(["clips/today", "clips/yesterday", "archive/2026"], ROOT_FOLDER, { clips: 2, archive: 1 })).toEqual([
      { path: "archive", label: "archive", childCount: 0, videoCount: 1 },
      { path: "clips", label: "clips", childCount: 0, videoCount: 2 },
    ])
  })

  it("builds child folders below the current folder", () => {
    expect(childFolders(["clips/today/a", "clips/today/b", "clips/yesterday"], "clips", { "clips/today": 3, "clips/yesterday": 1 })).toEqual([
      { path: "clips/today", label: "today", childCount: 0, videoCount: 3 },
      { path: "clips/yesterday", label: "yesterday", childCount: 0, videoCount: 1 },
    ])
  })

  it("ignores empty and all-folder sentinel values", () => {
    expect(childFolders(["", ALL_FOLDERS, "root/a"], "", {})).toEqual([{ path: "root", label: "root", childCount: 0, videoCount: 0 }])
  })

  it("builds breadcrumb items from a deep folder", () => {
    expect(breadcrumbFolders("clips/today/session")).toEqual([
      { path: "", label: "Root" },
      { path: "clips", label: "clips" },
      { path: "clips/today", label: "today" },
      { path: "clips/today/session", label: "session" },
    ])
  })

  it.each([
    ["", [{ path: "", label: "Root" }]],
    ["clips", [{ path: "", label: "Root" }, { path: "clips", label: "clips" }]],
    ["/clips/today/", [{ path: "", label: "Root" }, { path: "clips", label: "clips" }, { path: "clips/today", label: "today" }]],
  ])("builds breadcrumbs for %q", (folder, expected) => {
    expect(breadcrumbFolders(folder)).toEqual(expected)
  })

  it("converts folder options to selectable items", () => {
    expect(toFolderItems([ALL_FOLDERS, ROOT_FOLDER, "clips", "clips/today", "archive/2026/q1"])).toEqual([
      { path: "clips", depth: 0, label: "clips" },
      { path: "clips/today", depth: 1, label: "today" },
      { path: "archive/2026/q1", depth: 2, label: "q1" },
    ])
  })
})
