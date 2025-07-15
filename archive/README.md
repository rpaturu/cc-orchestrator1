# Sales Intelligence Archive

This directory contains archived components and interfaces from the Sales Intelligence platform's A/B testing phase.

## Old Chat Interfaces (`old-chat-interfaces/`)

During development, we tested four different chat interface approaches:

1. **NaturalLanguageChat.tsx** - Pure conversational interface
   - Casual, open-ended conversation style
   - Minimal structure, maximum flexibility
   - Good for exploratory discussions

2. **GuidedConversationChat.tsx** - Structured step-by-step approach
   - Guided prompts and workflows
   - Progressive information gathering
   - Clear next steps and recommendations

3. **SmartContextChat.tsx** - Adaptive AI with intelligent follow-ups
   - Context-aware responses
   - Smart follow-up questions
   - Adaptive to user input patterns

4. **DashboardChatHybrid.tsx** - Multi-panel professional interface
   - Chat + dashboard combination
   - Real-time data visualization
   - Professional sales environment focus

## Final Implementation

Based on A/B testing insights, we consolidated the best features into `HybridIntelligenceExperience.tsx`:
- Smart Context Recognition (from SmartContextChat)
- Dashboard Integration (from DashboardChatHybrid)
- Company History Navigation
- Mainline-inspired design system

## Why Archived

These files are preserved for:
- Reference and learning from A/B test insights
- Potential future feature extraction
- Understanding the evolution of the user experience
- Historical context for design decisions

**Note**: These files may have outdated dependencies and import paths since they were moved outside the active codebase. 