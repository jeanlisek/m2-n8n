---
name: hostile-review
description: Reads a specification, requirements document, architecture, plan or finished implementation (workflow, repository, document, prompt) as an adversary, to find how it could be followed to the letter while betraying its purpose, hijacked by malicious content or users, or drift over time, and to check that an implementation still matches its specs. Use it whenever someone asks to "challenge", "criticize", "attack", "do a hostile review", "find the holes", "does this meet the specs", "is this too heavy", "what can we simplify", "challenge ça", "attaque ça", "trouve les trous", "est-ce conforme aux specs", or before validating any specs, architecture or release, even when nobody asks. Facts about the outside world found on the way are handed to doubt-driven-dev, not guessed. Always produces a problem → safeguard table and a list of arbitrations to decide. Any language, any domain; write the review in the user's language.
---

# Hostile review

## Why this skill exists

A specification or an architecture can comply with every sentence of its request and still be useless, dangerous or impossible to verify. Nobody sees it when reading kindly, because kindness fills the holes with what the author meant.

This skill reads with the opposite assumption: the implementer is acting in bad faith, incoming data is hostile, time erodes everything, and every vague requirement will be read in the laziest possible way. What survives that reading is solid. What does not becomes a safeguard, an arbitration, or a fact to test.

The object under review may be a document (specs, architecture, plan) or an implementation (workflow, code repository, spreadsheet, prompt), in any domain. The skill also applies to your own output: reread what you just wrote as if someone else had written it.

Write the review in the **user's language**, table headers included.

## When not to use it

- To review code line by line: that is a code review, not a hostile review.
- When the person wants an overall opinion, not an attack. Ask whether they really want the hostile version; it is uncomfortable by design.
- On a draft the author has not finished: you attack a version, not a thought in progress.
- To settle whether a claim about the outside world is true: that is `doubt-driven-dev`, and it needs a test, not an attack.

## The six angles of attack

Go through all six, in order. Each one finds things the others miss. For each angle, write your findings into the output table before moving on, otherwise the first angles crowd out the last ones.

### 1. The letter against the spirit

For each requirement, imagine the laziest implementation that satisfies it word for word. "Weighted score": any weights at all. "Argued recommendation": one generic text everywhere. "Cited evidence": the AI invents a past project. "As many sources as possible": one. "Read from a configuration tab": an empty tab that silently yields nothing. If the lazy implementation satisfies the requirement, the requirement has a hole. The safeguard is whatever makes cheating impossible or visible.

### 2. Malicious content and misuse

Any text coming from outside can carry a hidden instruction for an AI. Any link or button can be clicked by someone who should not. Any free action can be repeated a thousand times. Look for:

- external content handed to an AI without being treated as untrusted data;
- an action triggerable without authentication, for instance through a forwarded email;
- a cost with neither cap nor alert, including costs that scale with an input nobody controls;
- personal data flowing without a legal basis or a retention period.

### 3. Drift over time

What works in month one degrades. Look for feedback loops (a score that learns from its own outputs, or from refusals, ends up hiding what it should show), self-serving evaluations (the person labeling the test set is also the one tuning the system), reference lists nobody maintains, thresholds set once and forever, tables and logs that only ever grow.

### 4. Contradictions between constraints

Put each constraint against every other, and name the pairs you compared. Some exclude each other: "as many sources as possible" and "full stop if one source fails"; "European vendor required" and "no requirement on the five other tools"; "no confidentiality constraint" validated by someone, but not by the person entitled to decide. A contradiction is not resolved inside the review: it becomes an **arbitration to decide**, phrased with 2 to 4 options, and goes back to `interview`.

### 5. Unverifiable requirements

Spot every word a tester cannot check: "quickly", "relevant", "later", "as many as possible", "high quality", and every "verified" with no observation behind it. Propose for each a number, a named list, a testable rule, or the observation that would verify it. Also look for missing success indicators: if nothing says how we will know it works, the project can neither succeed nor fail.

### 6. Weight

Look for what costs a lot for little value. For each expensive component or requirement, ask two questions: which need in the specs justifies this cost, and is there a much simpler way to meet it? A hand-built web page when a shared spreadsheet does the same job; a vector database when all documents fit in one read; a statistical computation on thirty data points. Propose delivery lots: the core that proves value first, the rest conditional. Do not confuse weight with modularity: several well-cut pieces beat one enormous one.

## The extra angle for an implementation: traceability

When reviewing an implementation (a workflow, a repository) and not just a document, add a spec ↔ implementation check in both directions:

- for each requirement in the specs: which element of the implementation covers it? None → a hole;
- for each element of the implementation: which requirement justifies it? None → an undocumented decision, to push back into the specs or remove. Include what the implementation computes and then throws away: a value produced and never shown is a decision nobody made.

An implementation may also document a choice that **contradicts** the specs. A documented choice is a choice, not an oversight, but the contradiction still needs arbitration: either the specs change, or the implementation does.

For n8n implementations in particular, read `references/n8n-pitfalls.md`: it lists concrete traps to check (misleading defaults, forced nodes, missing credentials, silent configuration). For another stack, build the equivalent list from the traps you meet, and keep it.

## Findings that are facts, not drifts

Some findings do not describe how the text could be betrayed; they rest on a fact about the outside world: "this API may block datacenter IPs", "this node does not retry", "this source publishes after the run". No safeguard can be written from an untested fact. List them apart as **facts to test** and hand them to `doubt-driven-dev`, whose reality path settles them; write the safeguard once the fact is known. A hostile review that turns an untested belief into a requirement adds a hole instead of closing one.

Likewise, a finding that is simply a bug (a silent failure, a missing check, a value computed and dropped) is a correction, not an arbitration: state it as a required safeguard and do not dress it up with options.

## Output format

Start with a one-sentence verdict: what the document covers well and what it does not. Then one table, ordered by severity, naming the angle that found each item (a finding often belongs to several angles: give the first, do not repeat the row):

```
| # | Angle | Requirement or element | Possible drift | Required safeguard |
```

Still walk the six angles in order while collecting: the single table is for the reader, the six angles are for you.

The safeguard is written as a **requirement**, not advice: "every piece of evidence links to an existing reference sheet, otherwise the mention 'no evidence found'", not "be careful about hallucinations".

End with three lists:

- **Facts to test**: the findings that depend on the outside world, each with the observation that would settle it. This is the input of `doubt-driven-dev`.
- **Arbitrations to decide**: the contradictions and the criteria to quantify, each with 2 to 4 options. This is the input of `interview`'s revision mode.
- **What must not be simplified**: the cheap elements that protect the essential. A hostile review that only says what to remove pushes people to remove what holds the system together too.

Then offer to integrate the safeguards, arbitrations and facts to test into the reviewed document, in dedicated sections, rather than leaving them in the conversation.

## Tone

The review is hard on the content and neutral on the author. Name problems without softening them ("misleading", "unverifiable", "silent"), but with no judgment of the person. If you produced the reviewed document yourself, say explicitly what you got wrong: a hostile review that spares its author is worthless.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "The author obviously meant..." | The implementer will not have the author at hand. They will have the text. |
| "This case is too unlikely" | Incidents are the sum of cases that were too unlikely. Note it; the person decides whether it deserves a safeguard. |
| "It's a documented choice, so it's fine" | Documented and compliant are two different things. A documented choice that contradicts the specs still needs arbitration. |
| "Simplifying means removing" | Simplifying means removing what does not earn its place. Removing a deduplication or an execution log is not simplification, it is regression. |
| "It's my own document, I know it" | That is exactly why you no longer see its holes. Reread it as if it came from a stranger. |
| "I'll resolve the contradictions myself" | A contradiction settled by the reviewer is a decision stolen from the person. Phrase the options, do not choose. |
| "I'll write the safeguard from what I believe about the tool" | A belief about the world is a fact to test, not a requirement. Hand it to `doubt-driven-dev` first. |

## Red flags

- A review with no problem → safeguard table: you commented, you did not attack.
- A safeguard phrased as advice ("be careful about...").
- Angle 4 reported without naming the constraint pairs that were compared: an absence of contradiction is credible only when the pairs are listed.
- A fact about the world turned into a safeguard without being tested.
- A bug dressed up as an arbitration with options.
- A review of your own output with no acknowledged mistake.
- A list of simplifications without a list of what to keep.
- An angle skipped because "the others already found everything".
