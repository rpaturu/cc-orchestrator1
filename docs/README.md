# 📚 Sales Intelligence Documentation

> **Documentation has been reorganized chronologically for better navigation and evolution tracking.**

## 🚀 **Quick Start - Where to Go**

### **👀 New to the Project?**
**Start here** → [`EVOLUTION-LOG.md`](EVOLUTION-LOG.md) to understand our architectural journey

### **🏗️ Implementing Features?**
**Latest Architecture** → [`CURRENT/architecture-current.md`](CURRENT/architecture-current.md)

### **📋 Planning Work?**
**Current Strategy** → [`CURRENT/strategy-current.md`](CURRENT/strategy-current.md)

### **🔧 Operations & Debugging?**
**Operations Guide** → [`CURRENT/operations-current.md`](CURRENT/operations-current.md)

### **🧭 Need Help Navigating?**
**Navigation Hub** → [`CURRENT/README.md`](CURRENT/README.md)

---

## 📁 **Folder Structure**

| Folder | Purpose | When to Use |
|--------|---------|-------------|
| **📍 CURRENT/** | Latest, authoritative documents | When you need the current approach |
| **📅 TIMELINE/** | Chronological evolution by phase | When you need historical context |
| **🔄 ACTIVE/** | Work-in-progress by topic | When working on new features |
| **📂 ARCHIVE/** | Historical and deprecated content | When researching past approaches |
| **🗂️ META/** | Documentation about documentation | When understanding processes |

---

## 🎯 **Current State (April 2024)**

- **Architecture**: Tiered Enrichment with Dataset Requirements Matrix
- **Strategy**: M2 Implementation with Vendor-First Differentiation  
- **Cache**: Three-layer cache strategy (Orchestrator → Source → Processor)
- **Implementation**: Step Functions orchestration with source-based naming

---

## 🔍 **Finding Information**

| I need to... | Go to... |
|--------------|----------|
| **Understand current architecture** | [`CURRENT/architecture-current.md`](CURRENT/architecture-current.md) |
| **See how we got here** | [`EVOLUTION-LOG.md`](EVOLUTION-LOG.md) |
| **Find a decision rationale** | [`META/DECISION-RECORDS/`](META/DECISION-RECORDS/) |
| **Look at historical approaches** | [`TIMELINE/`](TIMELINE/) folders |
| **Work on active features** | [`ACTIVE/`](ACTIVE/) folders |
| **Debug cache issues** | [`CURRENT/operations-current.md`](CURRENT/operations-current.md) |

---

## 📈 **Evolution Timeline**

Our architecture has evolved through 4 major phases:

1. **🏗️ M1 Foundation** (`TIMELINE/2024-01-M1/`) - Basic SerpAPI + LLM intelligence
2. **🎯 M2 Strategic Planning** (`TIMELINE/2024-02-M2/`) - Persona-specific insights and vendor focus  
3. **🗂️ Cache Architecture** (`TIMELINE/2024-03-CACHE/`) - Multi-consumer cost optimization
4. **⚡ Tiered Enrichment** (`TIMELINE/2024-04-TIERED/`) - Dataset-driven intelligent orchestration

**📖 Full details**: [`EVOLUTION-LOG.md`](EVOLUTION-LOG.md)

---

## 🚦 **Document Status**

- 🟢 **CURRENT**: Latest and authoritative
- 🟡 **DRAFT**: Work in progress  
- 🔵 **REFERENCE**: Historical but still relevant
- 🔴 **DEPRECATED**: No longer valid

---

## 🤝 **Contributing**

### **Working on Documentation**
1. **New work**: Add to appropriate `ACTIVE/` subfolder
2. **Finalized work**: Copy to `CURRENT/` when stable
3. **Major decisions**: Add to `TIMELINE/` with date prefix + Create ADR in `META/DECISION-RECORDS/`
4. **Deprecated approaches**: Move to `ARCHIVE/deprecated/`

### **Making Architectural Decisions**
1. Create ADR in `META/DECISION-RECORDS/`
2. Update relevant documents in `ACTIVE/`
3. When finalized, copy to `CURRENT/`
4. Add entry to `EVOLUTION-LOG.md`

---

*📅 Documentation reorganized: April 2024 | 🔄 Structure: Chronological Evolution* 