# 📍 Current Documentation Hub

> **This folder always contains the latest, authoritative versions of our core documents.**

## 🎯 **Quick Start - Where to Go**

### **👀 Just Joined the Project?**
Start here → [`../EVOLUTION-LOG.md`](../EVOLUTION-LOG.md) to understand our journey

### **🏗️ Implementing Features?**
Architecture → [`../architecture/tiered-enrichment-architecture.md`](../architecture/tiered-enrichment-architecture.md)

### **📋 Planning Work?**
Strategy → [`../strategy/m2-implementation-roadmap.md`](../strategy/m2-implementation-roadmap.md)

### **🔧 Operations & Debugging?**
Operations → [`../operations/cache-management-guide.md`](../operations/cache-management-guide.md)

---

## 📚 **Current State (April 2024)**

### **🏛️ Core Architecture**
- **Primary**: [Tiered Enrichment Architecture](../architecture/tiered-enrichment-architecture.md)
  - Dataset Requirements Matrix
  - Source-based naming (not tier-based)
  - Three-layer cache strategy
  - Step Functions orchestration

- **Supporting**: [Multi-Consumer Cache Architecture](../architecture/multi-consumer-raw-data-architecture.md)
  - Cost attribution across consumers
  - Advanced cache management
  - DataSourceOrchestrator

### **🎯 Strategy & Roadmap**
- **Primary**: [M2 Implementation Roadmap](../strategy/m2-implementation-roadmap.md)
  - Vendor-first differentiation
  - Persona-based schemas
  - Multi-source integration

- **Supporting**: [Vendor-First Strategy](../strategy/vendor-first-differentiation-strategy.md)
  - Competitive differentiation approach
  - Premium feature strategy

### **⚙️ Operations**
- **Cache Management**: [Cache Management Guide](../operations/cache-management-guide.md)
  - Three-layer cache strategy
  - Advanced debugging tools
  - Performance optimization

- **API Specifications**: [API Endpoints](../api-specifications/api-endpoints.md)
  - Current endpoint documentation
  - Request/response schemas

### **🧪 Integration Guides**
- **SerpAPI**: [SerpAPI Integration](../integrations/serpapi/serpapi-integration.md)
  - Multi-engine support
  - Rate limiting and caching

- **Tiered Enrichment**: [Tiered Enrichment Strategy](../integrations/tiered_enrichment_strategy.md)
  - Source prioritization
  - Cost optimization

---

## 📅 **Historical Context**

### **How We Got Here**
Our architecture has evolved through 4 major phases:

1. **M1 (Jan 2024)**: Basic SerpAPI + LLM intelligence
2. **M2 Planning (Feb 2024)**: Persona-specific insights and vendor focus
3. **Cache Architecture (Mar 2024)**: Multi-consumer cost optimization
4. **Tiered Enrichment (Apr 2024)**: Dataset-driven intelligent orchestration

📖 **Full timeline**: [`../EVOLUTION-LOG.md`](../EVOLUTION-LOG.md)

### **Decision Records**
For understanding *why* we made specific choices:
- 📋 **Architecture Decision Records**: [`../META/DECISION-RECORDS/`](../META/DECISION-RECORDS/)

---

## 🗂️ **Document Categories**

### **📍 CURRENT/** (You are here)
Latest, authoritative versions of core documents

### **📅 TIMELINE/**
Chronological evolution of ideas and approaches
- `2024-01-M1/` - Foundation release
- `2024-02-M2/` - Strategic planning
- `2024-03-CACHE/` - Cache architecture
- `2024-04-TIERED/` - Current tiered enrichment

### **🔄 ACTIVE/**
Work-in-progress organized by topic
- `architecture/` - Current architectural work
- `strategy/` - Strategic planning documents  
- `operations/` - Operational guides and procedures

### **📂 ARCHIVE/**
Historical documents and deprecated approaches
- `deprecated/` - No longer valid approaches
- `experiments/` - Proof-of-concept work

---

## 🚦 **Status Indicators**

Documents use these status indicators:

- 🟢 **CURRENT**: Latest and authoritative
- 🟡 **DRAFT**: Work in progress
- 🔵 **REFERENCE**: Historical but still relevant
- 🔴 **DEPRECATED**: No longer valid

---

## 🤝 **Contributing to Documentation**

### **When Adding New Documents**
1. **Current work**: Add to `ACTIVE/` by topic
2. **Completed work**: Copy to `CURRENT/` when stable
3. **Major decisions**: Add to `TIMELINE/` with date prefix
4. **Architectural decisions**: Create ADR in `META/DECISION-RECORDS/`

### **When Updating Strategy**
1. Update the relevant document in `ACTIVE/`
2. When finalized, copy to `CURRENT/`
3. Add entry to `EVOLUTION-LOG.md`
4. Create new timeline folder if it's a major phase

### **When Deprecating Approaches**
1. Move document to `ARCHIVE/deprecated/`
2. Add deprecation notice to original location
3. Update `EVOLUTION-LOG.md` with rationale

---

## 🔍 **Finding Information**

### **"I need to understand..."**
- **Current architecture** → `../architecture/tiered-enrichment-architecture.md`
- **Why we made a decision** → `../META/DECISION-RECORDS/`
- **How things evolved** → `../EVOLUTION-LOG.md`
- **Implementation details** → `../ACTIVE/` folders
- **Historical approaches** → `../TIMELINE/` folders

### **"I'm working on..."**
- **New features** → Check `../ACTIVE/architecture/` and `../strategy/`
- **Cache optimization** → `../operations/cache-management-guide.md`
- **API changes** → `../api-specifications/`
- **Integration work** → `../integrations/`

### **"Something's not working..."**
- **Debugging** → `../operations/` guides
- **Testing** → `../testing/` procedures
- **API issues** → `../api-specifications/`

---

*📅 Last updated: April 2024 | 📝 Next review: May 2024* 