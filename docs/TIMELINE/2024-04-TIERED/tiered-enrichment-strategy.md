
# Tiered Enrichment Strategy for DeepDiveJSON

A tiered enrichment strategy like **Snov.io → SerpAPI → Bright Data → (LLM or premium APIs)** offers a smart and scalable way to balance:

- **Cost efficiency** (freemium where possible)
- **Data depth** (progressively enrich fields)
- **Fallback resilience** (avoid single point of failure)

---

## 🧩 Suggested Tiered Enrichment Flow for `DeepDiveJSON`

### 🔹 Tier 1: Lightweight & Free (Snov.io)

- Contact discovery (email, title, domain-level)
- Company metadata (industry, domain, size)
- Use for:
  - `contactProfiles` (top 1–2 roles)
  - `enrichedCompanyData.name`, `domain`, `hq`

### 🔸 Tier 2: Mid-depth & Structured (SerpAPI)

- Google Search (news, funding, tech mentions)
- Google Jobs (via SerpAPI engine)
- LinkedIn search (light)
- Use for:
  - `newsAnalysis`
  - `funding.latestRound`
  - `vendorContentLinks`
  - `hiringTrends`
  - `contactProfiles` (titles only)

### 🔶 Tier 3: Full Control & Depth (Bright Data)

- Scraping LinkedIn, Greenhouse, vendor sites
- Search engine unlocker for contact/tech/funding
- Use for:
  - `contactProfiles` (full name/title/signal)
  - `techStack` (from site HTML or BuiltWith style)
  - `competitorInsights` (via scraped pages)
  - `hiringTrends` (scraped job boards)

### 🧠 Tier 4: LLM Reasoning (Bedrock Claude/Titan)

- Summarize and reason on populated fields
- Use for:
  - `recommendedProducts`
  - `persona_guidance`
  - `contextSummary`
  - `why_we_win` vs competitors

---

## 🔄 Enrichment Orchestration Strategy

```ts
async function enrichDeepDive(company: string, userPersona: Persona) {
  let deepDive: Partial<DeepDiveJSON> = {};

  // Tier 1 - Snov.io
  deepDive = { ...deepDive, ...await snovEnrichment(company) };

  // Tier 2 - SerpAPI
  deepDive = { ...deepDive, ...await serpapiEnrichment(company) };

  // Tier 3 - Bright Data (only if gaps remain)
  if (!deepDive.contactProfiles || deepDive.contactProfiles.length < 2) {
    deepDive = { ...deepDive, ...await brightDataEnrichment(company) };
  }

  // Tier 4 - LLM reasoning
  const contextJSON = await generateContextJSON(deepDive, userPersona);

  return { deepDive, contextJSON };
}
```
