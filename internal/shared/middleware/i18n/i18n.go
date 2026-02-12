package i18n

import (
	"embed"
	"encoding/json"
	"sync"
)

//go:embed locales/*.json
var localeFS embed.FS

var (
	mu      sync.RWMutex
	bundles = make(map[string]map[string]string)
)

func init() {
	loadLocale("en")
	loadLocale("id")
}

func loadLocale(lang string) {
	f, err := localeFS.ReadFile("locales/" + lang + ".json")
	if err != nil {
		return
	}
	var raw interface{}
	if err := json.Unmarshal(f, &raw); err == nil {
		mu.Lock()
		bundles[lang] = flatten(raw.(map[string]interface{}), "")
		mu.Unlock()
	}
}

func flatten(m map[string]interface{}, prefix string) map[string]string {
	out := make(map[string]string)
	for k, v := range m {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}
		switch val := v.(type) {
		case string:
			out[key] = val
		case map[string]interface{}:
			for subK, subV := range flatten(val, key) {
				out[subK] = subV
			}
		}
	}
	return out
}

func Tr(lang, key string) string {
	mu.RLock()
	defer mu.RUnlock()

	if lang == "" {
		lang = "en"
	}

	b, ok := bundles[lang]
	if !ok {
		b, ok = bundles["en"]
		if !ok {
			return key
		}
	}

	if v, ok := b[key]; ok {
		return v
	}

	return key
}

func Trf(lang, key string, args ...any) string {
	return Tr(lang, key)
}
