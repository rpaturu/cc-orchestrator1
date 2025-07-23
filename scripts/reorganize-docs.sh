#!/bin/bash

# Documentation Reorganization Script
# This script helps reorganize existing docs into the new chronological structure

set -e

DOCS_DIR="$(dirname "$0")/../docs"
cd "$DOCS_DIR"

echo "📚 Starting documentation reorganization..."

# Create new directory structure
echo "🏗️  Creating new directory structure..."

mkdir -p CURRENT
mkdir -p TIMELINE/{2024-01-M1,2024-02-M2,2024-03-CACHE,2024-04-TIERED}
mkdir -p ARCHIVE/{deprecated,experiments}  
mkdir -p META/DECISION-RECORDS

# Move current documents to appropriate timeline folders
echo "📅 Organizing timeline documents..."

# M1 Foundation (January 2024)
if [ -f "releases/M1-BACKEND-SUMMARY.md" ]; then
    cp "releases/M1-BACKEND-SUMMARY.md" "TIMELINE/2024-01-M1/release-summary.md"
    echo "✅ Moved M1 release summary"
fi

if [ -f "architecture/llm search and response.md" ]; then
    cp "architecture/llm search and response.md" "TIMELINE/2024-01-M1/llm-architecture-v1.md"
    echo "✅ Moved M1 LLM architecture"
fi

# M2 Strategic Planning (February 2024)  
if [ -f "strategy/m2-implementation-roadmap.md" ]; then
    cp "strategy/m2-implementation-roadmap.md" "TIMELINE/2024-02-M2/m2-implementation-roadmap.md"
    echo "✅ Moved M2 roadmap"
fi

if [ -f "strategy/vendor-first-differentiation-strategy.md" ]; then
    cp "strategy/vendor-first-differentiation-strategy.md" "TIMELINE/2024-02-M2/vendor-first-strategy.md"
    echo "✅ Moved vendor-first strategy"
fi

if [ -f "strategy/persona-schema-strategy.md" ]; then
    cp "strategy/persona-schema-strategy.md" "TIMELINE/2024-02-M2/persona-schema-strategy.md"
    echo "✅ Moved persona schema strategy"
fi

# Cache Architecture (March 2024)
if [ -f "architecture/multi-consumer-raw-data-architecture.md" ]; then
    cp "architecture/multi-consumer-raw-data-architecture.md" "TIMELINE/2024-03-CACHE/multi-consumer-architecture.md"
    echo "✅ Moved multi-consumer architecture"
fi

if [ -f "architecture/cache-ttl-configuration.md" ]; then
    cp "architecture/cache-ttl-configuration.md" "TIMELINE/2024-03-CACHE/cache-ttl-configuration.md"
    echo "✅ Moved cache TTL configuration"
fi

if [ -f "architecture/snippet-first-approach.md" ]; then
    cp "architecture/snippet-first-approach.md" "TIMELINE/2024-03-CACHE/snippet-first-approach.md"
    echo "✅ Moved snippet-first approach"
fi

# Tiered Enrichment (April 2024)
if [ -f "architecture/tiered-enrichment-architecture.md" ]; then
    cp "architecture/tiered-enrichment-architecture.md" "TIMELINE/2024-04-TIERED/tiered-enrichment-architecture.md"
    echo "✅ Moved tiered enrichment architecture"
fi

if [ -f "integrations/tiered_enrichment_strategy.md" ]; then
    cp "integrations/tiered_enrichment_strategy.md" "TIMELINE/2024-04-TIERED/tiered-enrichment-strategy.md"
    echo "✅ Moved tiered enrichment strategy"
fi

# Create CURRENT symlinks/copies to latest documents
echo "📍 Setting up CURRENT folder with latest documents..."

# Architecture - Latest is tiered enrichment
if [ -f "architecture/tiered-enrichment-architecture.md" ]; then
    cp "architecture/tiered-enrichment-architecture.md" "CURRENT/architecture-current.md"
    echo "✅ Current architecture → tiered enrichment"
fi

# Strategy - Latest is M2 roadmap
if [ -f "strategy/m2-implementation-roadmap.md" ]; then
    cp "strategy/m2-implementation-roadmap.md" "CURRENT/strategy-current.md"
    echo "✅ Current strategy → M2 roadmap"
fi

# Operations - Cache management
if [ -f "operations/cache-management-guide.md" ]; then
    cp "operations/cache-management-guide.md" "CURRENT/operations-current.md"
    echo "✅ Current operations → cache management"
fi

# Move experimental/deprecated content
echo "📂 Moving experimental content to ARCHIVE..."

# Move ChatGPT samples to experiments
if [ -d "strategy/chatgpt" ]; then
    cp -r "strategy/chatgpt" "ARCHIVE/experiments/"
    echo "✅ Moved ChatGPT experiments to archive"
fi

# Create initial ADR structure
echo "📋 Creating ADR examples..."

cat > "META/DECISION-RECORDS/001-multi-consumer-cache.md" << 'EOF'
# ADR-001: Multi-Consumer Cache Architecture

**Status**: ✅ Accepted  
**Date**: 2024-03-15  
**Deciders**: Architecture Team  

## Context
Need to optimize caching across multiple consumer types while maintaining cost attribution.

## Decision
Implement multi-consumer cache with cost attribution tracking.

## Consequences
- Reduced API costs through cache sharing
- Improved cost transparency
- Added complexity in cache management

## References
- [Multi-Consumer Architecture](../architecture/multi-consumer-raw-data-architecture.md)
EOF

echo "✅ Created sample ADR"

# Create status indicators file
cat > "META/STATUS-INDICATORS.md" << 'EOF'
# Document Status Indicators

## Legend
- 🟢 **CURRENT**: Latest and authoritative
- 🟡 **DRAFT**: Work in progress  
- 🔵 **REFERENCE**: Historical but still relevant
- 🔴 **DEPRECATED**: No longer valid

## Current Status Map

### 🟢 CURRENT
- `CURRENT/architecture-current.md` - Tiered enrichment architecture
- `CURRENT/strategy-current.md` - M2 implementation roadmap
- `CURRENT/operations-current.md` - Cache management guide

### 🔵 REFERENCE  
- `TIMELINE/2024-03-CACHE/` - Multi-consumer cache architecture
- `TIMELINE/2024-02-M2/` - M2 strategic planning documents
- `TIMELINE/2024-01-M1/` - M1 foundation architecture

### 🔴 DEPRECATED
- Legacy single-source approaches
- Hard-coded tier strategies
EOF

echo "✅ Created status indicators"

# Update main README with navigation
echo "📝 Creating navigation updates..."

cat > "README-REORGANIZED.md" << 'EOF'
# 📚 Sales Intelligence Documentation

## 🚀 Quick Navigation

### **👀 New to the project?**
Start here → [`EVOLUTION-LOG.md`](EVOLUTION-LOG.md)

### **🏗️ Building features?**  
Current architecture → [`CURRENT/architecture-current.md`](CURRENT/architecture-current.md)

### **📋 Planning work?**
Current strategy → [`CURRENT/strategy-current.md`](CURRENT/strategy-current.md)

### **🔧 Debugging issues?**
Operations guide → [`CURRENT/operations-current.md`](CURRENT/operations-current.md)

## 📁 Folder Structure

- **📍 CURRENT/** - Latest authoritative documents
- **📅 TIMELINE/** - Chronological evolution by phase  
- **🔄 ACTIVE/** - Work-in-progress by topic
- **📂 ARCHIVE/** - Historical and deprecated content
- **🗂️ META/** - Documentation about documentation

## 🔍 Finding Information

| I need to... | Go to... |
|--------------|----------|
| Understand current architecture | `CURRENT/architecture-current.md` |
| See how we got here | `EVOLUTION-LOG.md` |
| Find a specific decision rationale | `META/DECISION-RECORDS/` |
| Look at historical approaches | `TIMELINE/` folders |
| Work on active features | `ACTIVE/` folders |

EOF

echo "✅ Created reorganized README"

echo ""
echo "🎉 Documentation reorganization complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review the new structure in your file explorer"
echo "2. Update any links in your documents to use the new paths"
echo "3. Consider renaming README-REORGANIZED.md to README.md"
echo "4. Add status indicators (🟢🟡🔵🔴) to your documents"
echo "5. Create ADRs for future major decisions"
echo ""
echo "📍 Key locations:"
echo "   - Latest docs: CURRENT/"
echo "   - Evolution log: EVOLUTION-LOG.md"  
echo "   - Decision records: META/DECISION-RECORDS/"
echo "   - Timeline: TIMELINE/"
echo "" 