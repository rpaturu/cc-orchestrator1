
# SerpAPI Integration for DeepDiveJSON Enrichment

## ✅ Useful SerpAPI Endpoints for DeepDiveJSON

### 🔹 1. Google Search API
**Endpoint:** `https://serpapi.com/search.json?q=Acme+Corp`

| Helps Populate       | How                                                              |
| -------------------- | ---------------------------------------------------------------- |
| `newsAnalysis`       | Use `q=Acme Corp` + `tbm=nws` or `tbs=qdr:w` for recent articles |
| `funding`            | Extract from titles like “Acme raises Series C…”                 |
| `vendorContentLinks` | Use `site:vendor.com` + keyword (e.g. `site:okta.com lifecycle`) |
| `hiringTrends`       | Search for "Acme hiring", "Acme is hiring engineers", etc.       |
| `competitorInsights` | Compare with queries like `"Okta vs Microsoft Entra"`            |

✅ Returns structured JSON of snippets, links, dates, and sources.

---

### 🔹 2. Google Jobs Results API
**Endpoint:** `https://serpapi.com/search.json?q=site:greenhouse.io+Acme+jobs&engine=google_jobs`

| Helps Populate             | How                                                                         |
| -------------------------- | --------------------------------------------------------------------------- |
| `hiringTrends`             | Get structured job posting titles, locations, and company expansion signals |
| `enrichedCompanyData.size` | Growth signals can be inferred from job count and departments hiring        |

✅ Returns structured job cards with title, employer, location, and date posted.

---

### 🔹 3. LinkedIn People Search (Unofficial)
**Endpoint:** `https://serpapi.com/search.json?engine=linkedin&keywords=Director+IT+Acme+Corp`

| Helps Populate                                      | How                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `contactProfiles.name`, `title`, `signal`, `source` | Search roles like “CISO Acme Corp” and extract top 1–3 results                       |
| `persona_guidance`                                  | Tailor talk track based on buyer persona identified in role (e.g. Ops vs IT vs Exec) |

✅ Returns LinkedIn people cards: name, title, location, summary.  
⚠️ Unofficial — success varies by volume and region.

---

### 🔹 4. Google Knowledge Graph via SerpAPI
**Endpoint:** `https://serpapi.com/search.json?q=Acme+Corp&engine=google_kg`

| Helps Populate                                                     | How                                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `enrichedCompanyData.name`, `industry`, `founder`, `founded`, `hq` | Clean KG format returned from SerpAPI with simpler access than Google KG API directly |

✅ Simpler alternative to native Google KG API.

---

### 🔹 5. YouTube Search API
**Endpoint:** `https://serpapi.com/search.json?engine=youtube&search_query=Acme+Corp+Security+Webinar`

| Helps Populate         | How                                                     |
| ---------------------- | ------------------------------------------------------- |
| `vendorContentLinks[]` | Use for vendor webinars or recorded case studies        |
| `competitorInsights`   | Look for comparison talks, product demos                |
| `newsAnalysis`         | Pull insight from interviews, panels, or exec briefings |

✅ Captures video-based signals missed by traditional search.

---

## 🧠 Coverage Comparison

| `DeepDiveJSON` Field  | SerpAPI Coverage | Recommended Endpoint               |
| --------------------- | ---------------- | ---------------------------------- |
| `enrichedCompanyData` | ✅ Partial        | Google KG via SerpAPI              |
| `newsAnalysis`        | ✅ Strong         | Google News API                    |
| `techStack`           | ❌                | Use BuiltWith                      |
| `hiringTrends`        | ✅ Good           | Google Jobs Results                |
| `contactProfiles`     | ⚠️ Limited       | LinkedIn People Search             |
| `competitorInsights`  | ⚠️ Partial       | Google Search (e.g. Okta vs Entra) |
| `vendorContentLinks`  | ✅ Good           | Google Search + YouTube            |
| `recommendedProducts` | ❌                | LLM only                           |
| `persona_guidance`    | ❌                | LLM only                           |

---

## ✅ Why SerpAPI Is Useful

- Unified interface: one API key for all engines
- Structured responses (no scraping HTML yourself)
- Good fallback when Google APIs are rate-limited or blocked
- Great for rapid prototyping of a freemium research assistant
