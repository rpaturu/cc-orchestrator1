# Documentation Reorganization Strategy

## 🎯 **Objective**

Transform the documentation from scattered, topic-based folders into a **chronological, evolution-aware system** that helps team members understand:

1. **Where we are now** (current state)
2. **How we got here** (evolution timeline)  
3. **Why we made decisions** (decision rationale)
4. **What comes next** (active work)

## 📊 **Problem Analysis**

### **Before: Topic-Based Chaos**
```
docs/
├── architecture/          # Mixed old and new approaches
├── strategy/              # Various strategies from different time periods
├── operations/           # Some current, some outdated
├── api-specifications/   # Hard to know which is current
└── ...                  # No clear chronology or current state
```

**Issues:**
- ❌ Hard to find the "latest" version of anything
- ❌ No understanding of evolution or decision rationale  
- ❌ Mixed time periods in same folders
- ❌ Difficult onboarding for new team members
- ❌ Risk of implementing deprecated approaches

### **After: Chronological Clarity**
```
docs/
├── 📍 CURRENT/           # Always latest and authoritative
├── 📅 TIMELINE/          # Chronological evolution by phase
├── 🔄 ACTIVE/            # Work-in-progress by topic  
├── 📂 ARCHIVE/           # Historical and deprecated
├── 🗂️ META/              # Documentation about documentation
└── 📜 EVOLUTION-LOG.md   # Chronological decision log
```

**Benefits:**
- ✅ Clear "latest" state in CURRENT/
- ✅ Historical context preserved in TIMELINE/
- ✅ Decision rationale captured in ADRs
- ✅ Easy onboarding with evolution log
- ✅ Prevents implementing outdated approaches

## 🏗️ **New Structure Details**

### **📍 CURRENT/ - Single Source of Truth**
**Purpose**: Always contains the latest, authoritative versions

**Contents**:
- `architecture-current.md` → Latest architectural approach
- `strategy-current.md` → Current strategic direction  
- `operations-current.md` → Current operational procedures
- `README.md` → Navigation guide and quick links

**Maintenance**:
- Update when major decisions are finalized
- Copy from ACTIVE/ when work is complete
- Always keep synchronized with implementation

### **📅 TIMELINE/ - Evolution History**
**Purpose**: Chronological phases showing how thinking evolved

**Structure**:
```
TIMELINE/
├── 2024-01-M1/          # M1 Foundation
│   ├── release-summary.md
│   └── llm-architecture-v1.md
├── 2024-02-M2/          # M2 Strategic Planning  
│   ├── m2-implementation-roadmap.md
│   ├── vendor-first-strategy.md
│   └── persona-schema-strategy.md
├── 2024-03-CACHE/       # Cache Architecture Phase
│   ├── multi-consumer-architecture.md
│   ├── cache-ttl-configuration.md
│   └── snippet-first-approach.md
└── 2024-04-TIERED/      # Tiered Enrichment Phase
    ├── tiered-enrichment-architecture.md
    └── dataset-requirements-matrix.md
```

**Naming Convention**: `YYYY-MM-PHASE/`
- Year-Month for chronological sorting
- Descriptive phase name for context

### **🔄 ACTIVE/ - Work in Progress**
**Purpose**: Current work organized by topic (same as current structure)

**Contents**:
- `architecture/` - Architectural work in progress
- `strategy/` - Strategic planning documents
- `operations/` - Operational guides being developed
- `api-specifications/` - API documentation updates
- `development/` - Development guides and procedures
- `testing/` - Testing strategies and procedures
- `integrations/` - Integration guides and documentation

**Workflow**:
1. Create new work in appropriate ACTIVE/ subfolder
2. Iterate and refine within ACTIVE/
3. When finalized, copy to CURRENT/ and create TIMELINE/ entry

### **📂 ARCHIVE/ - Historical Context**
**Purpose**: Preserve deprecated approaches and experimental work

**Structure**:
```
ARCHIVE/
├── deprecated/          # No longer valid approaches
│   ├── single-source-strategy.md
│   └── tier-based-naming.md
└── experiments/         # Proof-of-concept work
    ├── chatgpt-samples/
    └── alternative-approaches/
```

### **🗂️ META/ - Documentation System**
**Purpose**: Documentation about the documentation system

**Contents**:
- `DECISION-RECORDS/` - Architecture Decision Records (ADRs)
- `STATUS-INDICATORS.md` - Legend for document status
- `DOC-REORGANIZATION-STRATEGY.md` - This document

## 📋 **Workflow & Processes**

### **Adding New Strategic Work**
```
1. Start in ACTIVE/strategy/new-strategy.md
2. Iterate and refine based on feedback
3. When finalized:
   a. Copy to CURRENT/strategy-current.md
   b. Copy to TIMELINE/YYYY-MM-PHASE/new-strategy.md
   c. Update EVOLUTION-LOG.md with context
   d. Create ADR in META/DECISION-RECORDS/ if architectural
```

### **Major Architecture Changes**
```
1. Start in ACTIVE/architecture/new-approach.md
2. Create ADR in META/DECISION-RECORDS/XXX-decision-name.md
3. When accepted:
   a. Copy to CURRENT/architecture-current.md
   b. Copy to TIMELINE/YYYY-MM-PHASE/new-approach.md
   c. Update EVOLUTION-LOG.md
   d. Move old approach to ARCHIVE/deprecated/ if needed
```

### **Deprecating Approaches**
```
1. Move document to ARCHIVE/deprecated/
2. Add deprecation notice to original location
3. Update EVOLUTION-LOG.md with rationale
4. Update STATUS-INDICATORS.md
5. Consider creating ADR explaining the change
```

## 🎨 **Status Indicators System**

Use emoji indicators in document titles and navigation:

- 🟢 **CURRENT**: Latest and authoritative
- 🟡 **DRAFT**: Work in progress  
- 🔵 **REFERENCE**: Historical but still relevant
- 🔴 **DEPRECATED**: No longer valid

**Example Usage**:
```markdown
# 🟢 Tiered Enrichment Architecture (Current)
# 🔵 Multi-Consumer Cache Architecture (Reference) 
# 🔴 Single-Source Strategy (Deprecated)
```

## 🧭 **Navigation Principles**

### **Quick Start Paths**
Every documentation entry point should provide these paths:

1. **New team member** → `EVOLUTION-LOG.md`
2. **Implementing features** → `CURRENT/architecture-current.md`
3. **Planning work** → `CURRENT/strategy-current.md`
4. **Debugging issues** → `CURRENT/operations-current.md`

### **Cross-References**
- Link between related documents across time periods
- ADRs should reference relevant architecture docs
- TIMELINE entries should link to current versions
- CURRENT docs should link to historical context

## 🔧 **Implementation Guide**

### **Step 1: Run Reorganization Script**
```bash
cd cc-orchestrator1/scripts
./reorganize-docs.sh
```

### **Step 2: Review and Adjust**
1. Check that documents are in appropriate timeline folders
2. Verify CURRENT/ contains the right latest versions
3. Update any broken internal links
4. Add status indicators to document titles

### **Step 3: Team Training**
1. Walk team through new structure
2. Explain workflow for adding new documents
3. Show how to find information using navigation guides
4. Practice creating an ADR for a recent decision

### **Step 4: Establish Maintenance**
1. Assign ownership for keeping CURRENT/ updated
2. Set review schedule for EVOLUTION-LOG.md
3. Create templates for ADRs and timeline entries
4. Add documentation updates to definition-of-done

## 📊 **Success Metrics**

This reorganization will be successful if:

1. **Onboarding Time**: New team members can understand current state in <30 minutes
2. **Decision Context**: Team can find rationale for any architectural decision
3. **Implementation Confidence**: Developers implement current approaches, not deprecated ones
4. **Maintenance Burden**: Documentation updates take <10% additional time
5. **Knowledge Retention**: Project knowledge survives team member transitions

## 🔄 **Continuous Improvement**

### **Monthly Review**
- Update EVOLUTION-LOG.md with new decisions
- Review CURRENT/ for accuracy
- Move completed ACTIVE/ work to appropriate locations
- Check for broken links or outdated references

### **Quarterly Review**
- Assess if new TIMELINE/ phases are needed
- Review ARCHIVE/ for documents that can be deleted
- Update navigation guides based on usage patterns
- Collect team feedback on documentation effectiveness

### **Evolution Triggers**
Create new TIMELINE/ phase when:
- Major architectural shifts occur
- Strategic direction changes significantly  
- New technology stacks are adopted
- Business model or target market evolves

---

**Remember**: The goal is not perfect documentation, but **useful, findable, and current** documentation that helps the team make better decisions faster. 