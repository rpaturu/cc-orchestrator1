
# Snov.io Integration for DeepDiveJSON Enrichment

## 🧠 What Is Snov.io?

**Snov.io** is a sales automation platform focused on:

- Email finder & verifier
- Company data enrichment
- Prospecting and lead generation
- Email sequencing & outreach tools

It provides APIs and browser tools to extract contact and company data from:
- Domains
- LinkedIn profiles
- Company pages
- Uploaded lists

---

## 🔍 Key Features Relevant to DeepDiveJSON

| Feature                         | Description                                                               | Usage in `DeepDiveJSON`                  |
|----------------------------------|---------------------------------------------------------------------------|-------------------------------------------|
| 🔗 Domain Search API             | Find all available emails for a domain                                   | `contactProfiles.email`, `title`          |
| 👤 Email Finder by Name/Company | Find a person’s email given their name + company                         | `contactProfiles.name`, `email`, `title`  |
| ✔️ Email Verifier API            | Verify deliverability of an email                                        | `contactProfiles[].verified`              |
| 🏢 Company Profile API           | Get name, size, industry, location, and domain of company                | `enrichedCompanyData.*`                   |
| 🧩 Technology Stack API          | Detect tech stack from company website                                   | `techStack[]` *(light version)*           |
| 🔗 LinkedIn Extension (manual)  | Manually extract contact info from LinkedIn into Snov CRM               | Manual fallback                           |
| 📤 Email Sequences               | Build multi-step outreach sequences (CRM tier)                          | Optional, not relevant to enrichment      |

---

## 💸 Pricing (July 2025)

| Plan     | Monthly Cost | Credits Included | API Access | Notes                                |
|----------|--------------|------------------|------------|--------------------------------------|
| Free     | $0           | 50 credits/day   | ✅ Yes     | Ideal for freemium plans             |
| Starter  | $39          | 1,000/month      | ✅ Yes     | ~$0.04/credit                        |
| Pro      | $99          | 5,000/month      | ✅ Yes     | ~$0.02/credit                        |
| Custom   | Varies       | Bulk             | ✅ Yes     | For large-scale lead gen            |

> 1 credit = 1 email or company lookup  
> Multiple lookups per company may cost 2–5 credits total

---

## 🧩 Fields Populated from Snov.io

| `DeepDiveJSON` Field            | API Used                    | Notes                                     |
|--------------------------------|-----------------------------|-------------------------------------------|
| `contactProfiles[].email`      | Domain Search               | Filter by job title                       |
| `contactProfiles[].title`      | Domain Search / Finder      | Paired with email returns                 |
| `contactProfiles[].name`       | Email Finder                | Requires name input                       |
| `enrichedCompanyData.name`     | Company Profile             | Official company name                     |
| `enrichedCompanyData.domain`   | Company Profile             | Website domain                            |
| `enrichedCompanyData.industry` | Company Profile             | General industry category                 |
| `enrichedCompanyData.size`     | Company Profile             | Employee size range                       |
| `enrichedCompanyData.hq`       | Company Profile             | Headquarters location                     |

---

## 🔄 Example Enrichment Flow

```ts
const enriched = await snovEnrichment("acme.com");

console.log(enriched);
/*
{
  enrichedCompanyData: {
    name: "Acme Corp",
    domain: "acme.com",
    industry: "Cybersecurity",
    hq: "San Francisco, CA",
    size: "201-500"
  },
  contactProfiles: [
    {
      name: "Jane Smith",
      title: "VP of Information Security",
      email: "jane.smith@acme.com",
      verified: true
    }
  ]
}
*/
```

---

## ✅ Why Snov.io Is Ideal for Tier 1

- ✅ Freemium plan with daily credits
- ✅ REST API with solid documentation
- ✅ Covers both company and contact data
- ✅ Email validation included
- 🚫 No support for funding, news, or rich insights

