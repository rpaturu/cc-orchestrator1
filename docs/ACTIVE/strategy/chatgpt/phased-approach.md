Phased Approach to Building Deep Dive JSON in Conversation


| Phase                                | Trigger                                       | What Happens                                         | Output                                              |
| ------------------------------------ | --------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| **Phase 1**: Identity & Company Init | User says “I’m meeting Acme Corp”             | Init `userPersona`, seed `customer.name`             | Start JSON shell                                    |
| **Phase 2**: Lightweight Enrichment  | Immediately after                             | Fetch public data (Clearbit, LinkedIn, tech signals) | `enrichedCompanyData`, `techStack`                  |
| **Phase 3**: User Inquiries          | “What’s in the news?” or “What do they use?”  | Pull news, show signals, ask follow-ups              | `newsAnalysis`, `vendorContentLinks`                |
| **Phase 4**: Rep Asks for Help       | “What should I pitch?” or “Who do I talk to?” | Use LLM chain with persona + JSON                    | Generates `recommendedProducts`, `contactsToEngage` |
| **Phase 5**: Export / Summary        | “Give me a summary”                           | LLM summarizes full Deep Dive into `ContextJSON`     | 1-pager or briefing card                            |


JSON Population Architecture

    ┌────────────┐    ┌────────────────────┐
    │ userPersona│──▶│ LLM / Persona Logic│──┐
    └────────────┘    └────────────────────┘  │
                                              ▼
┌────────────┐   ┌─────────────────────┐   ┌────────────┐
│ customer   │──▶│ External APIs (Clearbit, etc.) │   │
└────────────┘   └─────────────────────┘   ▼
                                           │
┌────────────────────────────┐      ┌────────────┐
│ LLM promptBuilderJSON()    │────▶│ Claude / Titan│
└────────────────────────────┘      └────────────┘
         │                                  │
         ▼                                  ▼
   recommended_products           competitive_positioning
         ▼                                  ▼
   target_contacts                 persona_guidance
         ▼                                  ▼
           ───────────► Final `DeepDiveContext`


Implementation Mechanics
| Component                           | Role                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Partial JSON object**             | Lives in memory or DB, updated after each user prompt                                          |
| **Prompt chaining**                 | Use current partial `DeepDiveJSON` as grounding context                                        |
| **Event-based enrichment**          | Background workers fetch or infer data asynchronously (e.g. techStack after customer is named) |
| **Caching**                         | Expensive enrichments (contacts, LinkedIn scraping) cached by domain                           |
| **Confidence or freshness scoring** | Used to re-trigger enrichment as needed                                                        |


| Insight                                          | Derived From                                   |
| ------------------------------------------------ | ---------------------------------------------- |
| “You should recommend Okta Lifecycle Management” | `hiringTrends`, `techStack`, `funding.purpose` |
| “Talk to Isabelle Tan and Rajiv Shah”            | `contactProfiles`                              |
| “They’re struggling with Azure AD federation”    | `competitorInsights`                           |
| “Here’s a similar case study”                    | `vendorContentLinks`                           |
| “They just raised Series C for EMEA expansion”   | `newsAnalysis` + `funding`                     |
