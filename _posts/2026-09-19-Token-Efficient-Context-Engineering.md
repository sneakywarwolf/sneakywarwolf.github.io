---

title: Token-Efficient AI- Headroom, Claude-Mem, and Context Engineering
author: nirmal
date: 2026-09-19 01:20:00 +0530
categories: [Technology, AI]
tags: [AI, Token-Optimization, Context-Engineering, Headroom, Claude-Mem, Claude-Code, Memory]
pin: false
description: How context compression, progressive disclosure, persistent memory, subagents, dynamic tool loading, and efficient context design reduce unnecessary AI computation and context consumption.
image:
     path: /assets/img/posts/token-efficient-ai.png
     alt: Token Efficient AI and Context Engineering

---

## Key Takeaways

* Token efficiency is primarily a **context-management problem**, not simply a prompt-writing problem.
* Headroom reduces context overhead through compression and caching strategies; Claude-Mem focuses on preserving useful knowledge across sessions.
* Progressive disclosure, subagents, dynamic tool discovery, and scoped rules prevent irrelevant information from entering the active context.
* The goal is not to minimise tokens blindly. The goal is to minimise **unnecessary** tokens without removing information required for correct reasoning.

## The hidden cost of an AI request

A user may type:

```text
Review this API.
```

The actual context sent to the model can contain much more:

```text
System instructions
+
Project instructions
+
Tool definitions
+
Conversation history
+
Files
+
Previous tool results
+
New tool output
+
User request
```

That means the prompt entered by the human is only one part of the model's workload.

This becomes especially important in agentic systems, where the model may repeatedly call tools and receive large outputs.

Anthropic has documented cases where large MCP tool collections alone can introduce tens of thousands of tokens of context overhead before the actual task begins.

## Token optimisation is really context engineering

The naive approach is:

```text
"Write shorter prompts."
```

The better approach is:

```text
What needs to load?
When should it load?
How long should it remain?
What can be compressed?
What can be persisted?
What can be isolated?
```

This is context engineering.

A useful target is:

```text
Maximum relevant context
```

rather than:

```text
Maximum context
```

## Progressive disclosure

One of the cleanest examples comes from Agent Skills.

Anthropic's Skill design loads the Skill's name and description first. The full Skill is loaded only when it is relevant, and supporting documents can be loaded even later.

Conceptually:

```text
Session starts
     ↓
Skill metadata
     ↓
Task matches Skill
     ↓
SKILL.md loaded
     ↓
Specific reference file loaded
     ↓
Task executed
```

Instead of:

```text
Load everything
     ↓
Keep everything active
```

this uses a staged information model.

It is similar to a well-structured manual:

```text
Table of contents
      ↓
Relevant chapter
      ↓
Relevant subsection
      ↓
Specific procedure
```

## Keep permanent context small

Permanent project instructions are useful for:

```text
coding conventions
architecture rules
required commands
security constraints
testing expectations
```

They are less suitable for:

```text
complete API documentation
large security playbooks
every historical decision
large reference datasets
```

Claude Code's current documentation explicitly recommends keeping `CLAUDE.md` focused and moving reference material into Skills or more narrowly scoped rules.

This creates:

```text
CLAUDE.md
    ↓
Always relevant

Skill
    ↓
Task relevant

Subagent
    ↓
Investigation relevant
```

## Headroom attacks the context itself

Headroom operates as a context-management layer designed to reduce the amount of redundant information reaching the model.

Its documentation describes compression of context and separate caching/retrieval mechanisms, including its Compress-Cache-Retrieve architecture.

Conceptually:

```text
Agent
  ↓
Large tool output
  ↓
Headroom
  ↓
Compressed context
  ↓
Model
```

This becomes useful for outputs such as:

```text
large logs
repetitive JSON
search results
scanner output
tool transcripts
generated records
```

## Compression does not have to mean data loss

Traditional summarisation creates a difficult trade-off:

```text
More compression
      ↓
Less context
      ↓
Higher risk of missing information
```

Headroom's CCR approach is designed to keep the original content available for retrieval while presenting a smaller representation to the model.

The model can therefore reason over:

```text
compressed representation
```

and retrieve the original when the detailed content is actually required.

This is fundamentally different from simply deleting old context.

## But compression depends on the workload

A repetitive 20,000-token log can often be compressed aggressively.

A 20,000-token source file containing unique code may not.

Headroom's own documentation states that actual savings depend heavily on how redundant the underlying content is.

Therefore:

```text
20,000 original tokens
→ not automatically
2,000 compressed tokens
```

The savings depend on content type and structure.

Headroom also provides a savings ledger for measuring compressed tokens and cost avoided rather than requiring the user to guess the benefit.

## Claude-Mem solves a different problem

Headroom and Claude-Mem should not be treated as identical technologies.

Headroom primarily addresses **how much context is being carried or transmitted**.

Claude-Mem addresses **what useful information should survive between sessions**.

Its documentation describes persistent memory that captures observations from tool usage, creates semantic summaries, and makes relevant knowledge available to later sessions.

The difference looks like this:

```text
Headroom

Current session
     ↓
Reduce unnecessary context
```

versus:

```text
Claude-Mem

Session 1
     ↓
Capture useful knowledge
     ↓
Persist

Session 2
     ↓
Retrieve relevant knowledge
```

## Why persistent memory matters

Without memory:

```text
Session 1
"Refresh-token rotation was missing."
```

Session ends.

```text
Session 2
"What did we discover about authentication?"
```

The agent may need to rediscover the project.

With persistent memory:

```text
Session 1
     ↓
Important observation stored

Session 2
     ↓
Relevant memory retrieved
     ↓
Continue from previous knowledge
```

This can remove repeated exploration and reduce duplicated reasoning.

But the memory layer itself consumes storage and may require additional processing, so its benefit should be evaluated across the complete workflow rather than looking only at the final prompt size. Claude-Mem documents its own persistence, hooks, storage, and compression components.

## Subagents are another context-control mechanism

Large tasks can be isolated.

Instead of:

```text
Primary session
   ↓
Review 300 files
   ↓
Keep all intermediate observations
```

use:

```text
Primary Agent
   ├── Auth subagent
   ├── API subagent
   └── Test subagent
```

The primary agent receives:

```text
Auth:
3 findings

API:
2 findings

Tests:
1 finding
```

rather than every intermediate line that produced those conclusions.

Claude Code's documentation explicitly describes subagents as separate contexts suitable for context-heavy work and states that their results are returned to the main session as summaries.

## Dynamic tool discovery matters too

Tool definitions can become a hidden context tax.

Anthropic documented a five-server MCP setup containing roughly 58 tools and approximately 55,000 tokens of tool-definition overhead. In another example, tool definitions reached roughly 134,000 tokens before optimisation.

The traditional pattern is:

```text
Load 100 tools
     ↓
Start task
```

A more scalable pattern is:

```text
Search available tools
       ↓
Find relevant tool
       ↓
Load that capability
       ↓
Execute
```

Anthropic's Tool Search design is specifically intended to discover tools on demand instead of loading every tool definition into the model context.

## Tool outputs can be worse than tool definitions

A tool schema may cost a few hundred tokens.

Its output could be:

```text
25,000-line log
```

or:

```text
5 MB JSON response
```

That creates a second optimisation problem.

The agent architecture therefore needs to manage both:

```text
tool definitions
```

and:

```text
tool results
```

This is one reason context compression is becoming an architectural feature rather than a simple prompt trick.

## Use code for deterministic bulk work

Another important optimisation is deciding when the model should reason and when ordinary code should execute.

Anthropic's advanced tool-use work notes that repeated natural-language tool calls cause inference passes and accumulate intermediate results in context, while programmatic tool calling can move loops, filtering, conditionals, and data transformations into code.

For example, this is often inefficient:

```text
Model
 ↓
Read record 1
 ↓
Reason
 ↓
Read record 2
 ↓
Reason
 ↓
Read record 3
 ↓
Reason
```

Whereas:

```text
Model
 ↓
Python / code
 ↓
Filter 10,000 records
 ↓
Return only anomalies
 ↓
Model
```

The model should receive the information required for reasoning, not necessarily every raw record.

## The optimisation stack

A practical context-efficient setup can therefore look like:

```text
CLAUDE.md
    ↓
small permanent context

Skills
    ↓
on-demand expertise

Dynamic tools
    ↓
load only what is needed

Subagents
    ↓
isolate large work

Headroom
    ↓
compress redundant context

Memory
    ↓
preserve useful discoveries

Code execution
    ↓
process large datasets outside the model
```

This is considerably more sophisticated than simply asking the model to "use fewer tokens."

## The actual objective

Token optimisation has three competing objectives:

```text
Correctness
Efficiency
Recoverability
```

If compression is too aggressive:

```text
Efficiency ↑
Correctness ↓
```

If everything is retained:

```text
Correctness ↑
Context cost ↑
```

If everything is discarded after each session:

```text
Fresh context ↑
Repeated work ↑
```

The better architecture is selective:

```text
Keep what matters.
Compress what repeats.
Persist what will matter later.
Isolate what does not belong in the main session.
```

## Practical design rules

```text
Permanent rules → keep small

Task-specific knowledge → Skills

Large investigations → subagents

Large raw outputs → compress/filter

Long-term discoveries → memory

Large data transformations → code

Large tool libraries → dynamic discovery
```

The goal is not to make the model see less.

The goal is to make the model see **the right things**.

## References

* Anthropic — Introducing Agent Skills.
* Anthropic — Advanced Tool Use.
* Headroom — Compression, CCR, and savings tracking.
* Claude-Mem — Persistent memory for Claude Code.
* Claude Code Documentation — Context, Skills, subagents, hooks, and tool loading.
