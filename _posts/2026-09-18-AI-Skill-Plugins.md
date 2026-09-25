---

title: AI Skills, Plugins, and the Agent Stack- How the Right Combination Gets Work Done
author: Nirmal Chakraborty
date: 2026-09-18 00:15:00 +0530
categories: [Technology, AI]
tags: [AI, Agentic-AI, Skills, Plugins, MCP, Subagents, Automation]
pin: false
description: How AI skills, plugins, MCP, subagents, hooks, memory, and project instructions work together to turn a general-purpose model into a practical execution system.
image:
        path: /assets/img/posts/ai-agent.png
        alt: AI Skills and Plugin Agent Stack
---

## Key Takeaways

* A model provides reasoning, but the surrounding agent architecture determines what the model can actually accomplish.
* Skills provide reusable domain knowledge and workflows; MCP provides access to external systems; subagents provide isolated execution; hooks provide deterministic automation; plugins package these capabilities together.
* The strongest AI workflows do not put everything into one giant prompt. They distribute knowledge, tools, automation, and state across the appropriate layer.
* The quality of an AI system increasingly depends on **how capabilities are composed**, not merely which model is being used.

## The model is only one part of the system

The common mental model of AI is:

```text
User
  ↓
Prompt
  ↓
Model
  ↓
Answer
```

That model is sufficient for explanation, brainstorming, summarisation, and many simple coding tasks.

Real engineering work is different.

A development or security workflow may require the system to:

```text
Understand the project
        ↓
Inspect files
        ↓
Search the codebase
        ↓
Query external systems
        ↓
Execute commands
        ↓
Run tests
        ↓
Analyse results
        ↓
Modify code
        ↓
Review the changes
        ↓
Produce an artifact
```

A model can reason about those steps, but reasoning alone does not give it access to the repository, ticketing system, browser, database, test environment, or deployment pipeline.

This is where the agent stack becomes important.

## The building blocks

Modern agent environments increasingly separate several functions instead of treating them as one feature.

| Component                          | Primary role                                 |
| ---------------------------------- | -------------------------------------------- |
| `CLAUDE.md` / project instructions | Persistent project context and conventions   |
| Skills                             | Reusable knowledge and workflows             |
| MCP                                | Connection to external tools and services    |
| Subagents                          | Isolated workers for specialised tasks       |
| Hooks                              | Deterministic automation triggered by events |
| Plugins                            | Packaging and distribution of capabilities   |
| Memory                             | Useful information retained across sessions  |
| Code intelligence                  | Symbol-aware code navigation and diagnostics |

Claude Code's current documentation explicitly distinguishes these roles and describes plugins as packaging layers that can combine Skills, hooks, subagents, MCP servers, and other capabilities.

## Skills are reusable expertise

A Skill is a reusable unit of procedural knowledge.

Anthropic describes Skills as directories containing a `SKILL.md` plus optional instructions, scripts, and resources. The important design principle is **progressive disclosure**: the agent can first discover a Skill's metadata and load the detailed content only when the Skill is relevant.

A simplified structure might look like:

```text
skills/
└── api-security-review/
    ├── SKILL.md
    ├── methodology.md
    ├── examples/
    └── scripts/
```

Instead of repeatedly explaining:

```text
Review authentication.
Check authorisation.
Check session handling.
Check input validation.
Check business logic.
Document evidence.
```

the workflow can become:

```text
/audit-api
```

The important distinction is that a useful Skill is more than a saved prompt.

It can contain:

```text
knowledge
workflow
references
decision criteria
scripts
examples
```

Anthropic also recommends using traditional code where deterministic execution is more reliable or efficient than asking the model to generate every step itself.

## MCP provides capability, not methodology

MCP solves another problem:

```text
The AI knows what should happen
but cannot access the required system.
```

For example:

```text
AI Agent
   ├── GitHub
   ├── Jira
   ├── Database
   ├── Browser
   └── Internal APIs
```

MCP can provide the connection to those systems.

But connectivity alone is not enough.

Consider a database.

MCP may provide:

```text
query()
get_schema()
list_tables()
```

A Skill can provide:

```text
Which tables matter
Which relationships matter
Which fields contain sensitive data
Which queries are appropriate
Which queries should be avoided
How the result should be interpreted
```

Claude Code's documentation makes this exact distinction: MCP supplies access to external systems, while Skills can provide the domain knowledge and workflow for using those systems correctly.

So:

```text
MCP = "You can access the database."

Skill = "Here is how this organisation's database should be used."
```

## Subagents solve a different problem

Large investigations can overwhelm the primary context.

Instead of doing:

```text
Primary Agent
   ↓
Read 300 files
   ↓
Perform 100 checks
   ↓
Keep all intermediate output
```

the work can be split:

```text
Primary Agent
   ├── Authentication reviewer
   ├── API reviewer
   ├── Dependency reviewer
   └── Test reviewer
```

Each worker operates in an isolated context and returns only the useful result.

Claude Code currently documents subagents specifically as isolated workers suited to context-heavy or specialised work.

This changes the architecture from:

```text
one model doing everything
```

to:

```text
orchestrator
    ↓
specialised workers
    ↓
structured results
```

## Hooks are where deterministic behaviour belongs

There are tasks where the model should not have to decide whether something happens.

For example:

```text
File edited
   ↓
Hook
   ↓
Run formatter
   ↓
Run tests
   ↓
Return result
```

Another example:

```text
Dangerous command requested
        ↓
Pre-tool hook
        ↓
Block execution
```

Claude Code distinguishes hooks from Skills precisely because hooks are event-driven and deterministic, whereas Skills depend on the agent applying instructions and reasoning through a workflow.

This leads to a useful rule:

```text
If something must happen every time,
make it automation.

If the agent must decide how to do something,
make it a Skill.
```

## Plugins are the packaging layer

A Plugin becomes useful when the same setup needs to be reused or distributed.

Conceptually:

```text
security-plugin/
├── skills/
│   ├── api-review/
│   ├── mobile-review/
│   └── report-writing/
├── agents/
│   ├── reviewer.md
│   └── validator.md
├── hooks/
│   └── validation.sh
└── .mcp.json
```

The plugin can then represent an entire capability stack.

Claude Code's current documentation describes Plugins as bundles that can package Skills, agents/subagents, hooks, MCP servers, and related configuration for reuse across projects.

That is much more scalable than distributing a document containing instructions and telling every developer to copy-paste them into a conversation.

## The correct combination

The real power appears when the components are combined intentionally.

Consider an API security workflow:

```text
Project instructions
        ↓
Security Skill
        ↓
MCP → source repository
        ↓
MCP → test environment
        ↓
Subagent → authentication analysis
        ↓
Subagent → authorisation analysis
        ↓
Subagent → API abuse analysis
        ↓
Hook → automated validation
        ↓
Primary agent
        ↓
Security report
```

Every layer has a specific responsibility.

```text
CLAUDE.md
"What rules always apply?"

Skill
"How is this task performed?"

MCP
"Which external systems can I use?"

Subagent
"Which work should happen in isolation?"

Hook
"Which action must happen automatically?"

Plugin
"How do I package and distribute all of this?"
```

That separation is what makes the system manageable.

## Why one giant prompt is a poor architecture

A giant prompt may initially look attractive:

```text
Here are all project rules.
Here is the API documentation.
Here is our security methodology.
Here are the test cases.
Here is the database schema.
Here are the deployment instructions.
Here are all the tools.
Here is the previous conversation.
```

The problem is that the model now has to determine what matters from everything.

The better architecture is:

```text
Always-needed context
        +
Relevant Skill
        +
Required tools
        +
Specialist worker
        +
Useful memory
```

This is effectively **context engineering**.

The objective is not maximum information.

It is maximum **relevant information at the right time**.

## A practical architecture

```text
                 ┌───────────────┐
                 │     MODEL     │
                 │ Reasoning     │
                 └───────┬───────┘
                         │
                ┌────────▼────────┐
                │ KNOWLEDGE       │
                │ Skills + Rules  │
                └────────┬────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     MCP Tools       Subagents         Memory
        │                │                │
        └────────────────┼────────────────┘
                         │
                     Hooks
                         │
                    Execution
                         │
                    Artifacts
```

The model remains the reasoning engine.

Everything around it determines how effectively that engine can operate.

## Security becomes part of the architecture

As agents become more capable, their extension ecosystem becomes part of the security boundary.

Anthropic warns that Skills can contain executable code, scripts, dependencies, and network-related behaviour and recommends treating Skills as software that should be inspected before being trusted.

The same principle applies to Plugins and MCP servers.

A sensible trust chain is therefore:

```text
Model
  ↓
Skill
  ↓
Plugin
  ↓
MCP server
  ↓
Tool
  ↓
Permission
  ↓
Data / system access
```

More capability means more potential attack surface.

## The deeper shift

The progression is:

```text
Prompt engineering
        ↓
Tool use
        ↓
Agent workflows
        ↓
Composable capabilities
        ↓
Multi-agent systems
        ↓
AI execution environments
```

The model is becoming only one component of the system.

The important engineering skill is increasingly knowing **which capability belongs where**.

That is what allows a relatively small instruction such as:

```text
"Audit the authentication flow."
```

to trigger a complete, repeatable workflow rather than a generic answer.

## References

* Anthropic — Introducing Agent Skills.
* Claude Code Documentation — Extending Claude Code.
* Claude Code Documentation — `.claude` directory and project configuration.
