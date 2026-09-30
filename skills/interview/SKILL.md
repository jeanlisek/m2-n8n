---
name: interview
description: Runs a scoping interview one question at a time, with options and a stated bet, to turn a vague idea (project, feature, automation, tool, document) into a verifiable specification, then checks what already exists before the need is frozen. Use it whenever someone asks for specs, requirements, a scoping session or a "cahier des charges", says "interview me", "grill me", "interviewe-moi", "pose-moi les questions", describes a need without saying for whom, why or how success will be measured, wants to revisit answers from a previous interview, or asks what already exists before building ("is there already a tool for this", "check ce qui existe déjà", "est-ce que ça existe déjà"). Not for reviewing or attacking an existing specification (that is hostile-review). Trigger it even when "specs" is never said, as soon as something is about to be designed whose need is not written down. Any language, any domain; interview and deliverable in the user's language.
---

# Interview

## Why this skill exists

What a person asks for and what they need are two different things. They ask for "a summary email" because that is the usual thing to ask for, not because an email solves their problem. They ask for "a dashboard" when what they lack is a list. They say "as many sources as possible" without knowing that every source is one more way to fail.

The cheapest moment to find that gap is before any plan, architecture or code exists. Once building has started, whatever exists gets rationalized into "good enough", and the gap is locked in.

This skill closes the gap before it costs anything. It establishes facts, needs and constraints, checks what already exists, and leaves the design to the next step. It applies to any domain: a software feature, an automation, an internal tool, a document, a process.

Conduct the interview, the restate and every deliverable in the **user's language**, section titles and labels included. The instructions below are in English; the conversation is not.

## When not to use it

- The request is unambiguous and self-contained ("rename this file", "fix this typo").
- The person explicitly asks for speed over rigor.
- It is a pure information request ("how does X work?").
- The person wants an existing specification reviewed or attacked: that is `hostile-review`.
- There is no live person: pipeline, scheduled run, autonomous loop. Flag the missing scoping as a blocker instead of guessing.

## The five rules of conduct

1. **One question per message.** Three questions at once is a survey people skim, not an interview, and the third question usually depends on the answer to the first.
2. **Always a visible bet; options only when the answer space is known.** People react to a proposal faster than they produce an answer from scratch, and stating a bet commits you to a hypothesis you can be visibly wrong about, which exposes your assumptions: that is the point. On a **closed question** (what starts the process, what to do when a source fails, how many items at most), offer 2 to 4 options with one marked "my bet", and always leave room for a free answer; if a choice-question tool is available, use it, tapping beats typing. On an **open question** (for whom, why now, what success looks like, what the person actually wants), offer **one bet and no list**: a list of plausible answers invites the person to pick the one that sounds right instead of saying what they want, which is the very trap this skill exists to avoid.
3. **Naive interrogator.** You know nothing about the business, its tools, jargon or acronyms. Every assumption gets questioned. "The official bulletin", "the team", "the reference sheets": ask exactly what they are.
4. **Zero technical solutions during the questions.** No product, database, API or architecture names while the need is being established. If the person proposes one, record it as a constraint or preference and go back to the need ("what must it make possible?"). Solutions get their turn in the exploration step below, once the need is written down.
5. **Acknowledge before asking the next question.** One sentence restating the answer in your own words. That is where misunderstandings show up.

## The three phases, in order

Each phase has a coverage goal. Move to the next one only when you can answer all of its questions without guessing. The questions below are phrased for a recurring process; adapt the wording to the object (a feature, a document, a one-off project), never the coverage.

### Phase 1: starting point and expected result

- What precise event starts it? A schedule, an external publication, a human action, a decision, a combination?
- What does the "perfect" deliverable look like? In what form does it arrive, to whom, and what must it contain, field by field?
- What makes an item, a result or a case "interesting", "priority", "relevant"? Push until you get a criterion a tester could check.
- How many at most, in what order, and what happens when there are **none**?

### Phase 2: environment: tools, data, dependencies

- Which software, platforms, sources or people must be involved? For each: is there already access, an account, a test environment? "To be checked" is a valid answer, but it becomes an open point.
- Where does the data the process needs live? If in two places, which one is authoritative when they disagree?
- Are there vendor or policy constraints (sovereignty, hosting, license, cost, brand)? How far do they apply: to one component, or to all of them?
- Known limits: quotas, sending caps, reuse conditions, rate limits?

### Phase 3: constraints and failure cases

- What volume per day, per week, per run? "Unknown, to be measured" is acceptable if you derive a requirement from it: the process must then count what it handles.
- What budget, especially when something is billed per use? Is a safety cap needed during testing?
- If a dependency fails mid-way: retry, stop, alert whom, deliver a partial result? How is the missed period or work caught up?
- Personal data, confidentiality, security: what is handled, how long is it kept, who must approve? If the person says "no constraint", ask who decided that.
- Who receives the result during testing, and what concrete criterion triggers widening it to others?

## The reflexes always missing on the first pass

Ask these even if the person never brings them up. They are what makes things fail once in use, and never what anyone thinks to ask spontaneously.

- **Calendar edge cases**, for anything recurring: weekends, public holidays, vacations, time zones. What does Monday's run cover?
- **Repetition**: must an item shown yesterday appear again today? Until when?
- **The empty result and the first run**: what happens when there is nothing to report, and the very first time, when there is no history yet?
- **The verifiable criterion**: every vague word ("quickly", "as many as possible", "relevant", "later in the morning") must become a number, a named list or a testable rule. If the person cannot put a number on it, offer 3 values and a "to be set after measurement" option.
- **Contradictions caught live**: when two answers contradict each other ("as many sources as possible" and "everything stops if one source fails"), flag it immediately and get it arbitrated instead of silently writing it down.
- **Who maintains it**: lists, thresholds and templates decay. Who updates them, and how will anyone know they are stale?
- **What is not being built**: half of all disagreements are about what is out of scope. Get it said explicitly.

## Listening for "what I want" behind "what I should want"

The most dangerous answers are those that sound like a thoughtful answer rather than a real need: "it has to be scalable", "like everyone does it", "a dedicated web page". When you hear a buzzword or a convention in place of an outcome, ask: *"Set aside what you would have to justify to others: what would you actually want?"* That one question often does more than the previous five.

"Whatever" or "up to you" is not an answer: it is a delegation. Reframe as two concrete options and make the person choose.

## The exploration step: what already exists

Once the three phases are done and before the specification is compiled, stop asking and go look. A need frozen without this step gets rebuilt from scratch when a tool, a template, a skill or an API already covers it, and the person finds out after the architecture exists.

Explore four families, with subagents when the environment has them (one per family, in parallel, each returning a short list with sources and dates), by yourself otherwise:

- **existing solutions**: products, templates, published workflows or documents that do the job or part of it;
- **skills and tooling** available in the environment (installed skills, connectors, CLIs);
- **sources and APIs** the need depends on: do they exist, are they free, keyless, reachable, and what do they return (a test call beats a documentation page);
- **approaches**: how others solved the same problem, and what they warn about.

Announce the step ("I'm going to check what already exists before writing the specs"), then come back with **one question per finding that changes the scope**: reuse it, adapt it, or build anyway, with your bet. Findings that do not change the scope go into the specification, not into the conversation. Any claim from this step about the outside world ("this API is free") is a hypothesis until tested: test it now, or record it in the hypotheses table with its risk. Do not skip the step because "nothing like this will exist": that belief is what the step exists to check, and it is wrong more often than it looks.

## The restate and the explicit yes

Before compiling the specification, write back what you think the need is, in 6 to 8 lines the person can correct line by line: outcome, for whom, why now, success criterion, binding constraint, out of scope. Get an **explicit yes**. "Whatever you think", "sounds good" or silence are not a yes: ask what they would refine. Once the yes is given, deliver the specification and **stop your turn**: no architecture, no tool call, no next step in the same message. The person chooses what comes next, usually `hostile-review`.

## When to stop

A phase is done when you can predict the answers to the next three questions you would ask. The interview is done when all three phases are, the exploration step has run, and the restate got its yes. If after several rounds you still cannot predict, that is not a reason to keep going: say so, something foundational is missing, and offer to step back.

## Revision mode

When the person wants to revisit their answers, restart the interview **from the beginning or from the chosen phase**, one question at a time, recalling the previous answer under each question. They confirm or change it. Each change may invalidate later answers: restate the ones that depend on it and get them validated again. Never alter an answer the person did not explicitly change: a silently rewritten answer is a decision taken in their name.

## The deliverable: the specification

Compile it in Markdown, in the user's language, under the title `# Specs | [Name]`, with exactly this structure. Every section exists even when short.

```
# Specs | [Name]
Version, date, status

## Objective
The starting problem (one sentence), then what the thing does.

## Scope and delivery lots
Lot 1 (MVP) / lot 2 / lot 3, each with its content and its entry condition.
Phases 1 to 3 describe lot 1 only.

## Phase 1: starting point and deliverables
## Phase 2: environment (tools, data, dependencies)
## Phase 3: constraints and failure cases

## Success criteria
The starting problem, 2 or 3 quantified indicators,
and a verifiable criterion for every vague requirement.

## Existing solutions considered
What was found (with sources and dates), what was reused or discarded, and why.

## Hypotheses and constraints
Unverified hypotheses (with the risk if false),
retained constraints, contradictions and their arbitration.

## Open points
Numbered table: point, likely owner.
```

Mark "to be decided" everything the interview did not settle, and list at the end the questions you added on your own without asking them. This specification is the input of `hostile-review`, which reads it as an adversary before any architecture.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "The request is clear enough" | If you cannot write the expected deliverable in one sentence, field by field, it is not. |
| "25 questions waste their time" | 25 questions cost 20 minutes. Building the wrong thing costs weeks, and the person pays for it. |
| "I'll suggest a solution, it will go faster" | A solution suggested during the interview becomes a constraint nobody chose. |
| "They said 'whatever', so I decide" | "Whatever" is delegation. Two concrete options, and they choose. |
| "Nothing like this exists, no need to look" | That is a claim about the world. Ten minutes of search cost less than a week rebuilding what a template already does. |
| "Calendar and duplicates, we'll see at configuration time" | That is exactly what nobody sees at configuration time. Forgetting them costs a missed Monday email and the same item ten days in a row. |
| "A contradiction, I'll note it in the doc" | An unarbitrated contradiction becomes a choice made by the builder instead of the client. |
| "They said 'sounds good', that's a yes" | It is a polite exit. Ask what they would refine; only an explicit yes on the restate counts. |

## Red flags

- Two or more questions in one message.
- A question without a bet attached.
- A closed question without options, or an open question ("for whom?", "why?") with a list of answers to pick from.
- A product, tool or API name in your questions.
- A requirement accepted with a vague word in it.
- A "yes" to a vague summary taken as validation.
- A specification compiled before an explicit yes on the restate.
- A specification without an "Existing solutions considered" section.
- A specification produced without the "Open points" section.
