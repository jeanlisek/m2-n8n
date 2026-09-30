---
name: doubt-driven-dev
description: Subjects every non-trivial decision (architecture choice, claim about an API, a tool, a product or a platform, configuration, data write, release) to an attempt at refutation before it stands. State the thesis, list the facts it rests on, test what concerns the real world, have the reasoning attacked by a context-free reviewer, then classify the objections. Use it during construction, as soon as a confident claim has not been verified ("it works", "this API is free", "this node does that"), before doing something costly to undo, when the code or tool is unfamiliar, or when someone says "are you sure?", "verify", "test it", "prove it", "es-tu sûr ?", "vérifie", "teste-le", "prouve-le". Not for reviewing a finished document ("challenge ça", "trouve les trous" belong to hostile-review) nor for a plain confirmation before an action. Trigger it on your own answers too, whenever you assert without having tested. Any language, any domain; report in the user's language.
---

# Doubt-driven dev

## Why this skill exists

Confidence is not evidence. Over a long session, accumulated context turns assumptions into "facts" without anyone noticing: a stack called "sovereign" without checking the host, an API assumed free, a source assumed to publish before the run, a tool assumed not to exist when it has thousands of users.

This skill installs a reflex: before a non-trivial decision stands, try to **refute** it, not to validate it. Either by a test against reality, or by a reviewer who does not share your context. What resists is accepted; what falls is fixed while it is still cheap.

It is not a final review. A final review judges a finished artifact; here you doubt along the way, decision by decision, while correcting still costs little. It applies to any domain: code, automations, documents, analyses, advice.

Report in the **user's language**, checklist labels included.

## What counts as a non-trivial decision

A decision is non-trivial when at least one of these holds:

- it depends on a **fact about the outside world**: an API exists, is free, answers from this environment, returns this field; a tool or a node behaves a certain way; a product has a feature; a source publishes at this hour; something "does not already exist";
- it moves or changes **data** (writing to a file or a spreadsheet, sending a message, creating an event, deploying), especially irreversibly;
- it involves an **AI model**, a prompt, or generated content that others will rely on;
- it touches **error handling**, retries, reruns, recovery;
- it commits to a recurring **cost** or an obligation;
- it asserts **compliance** ("this matches the specs", "this is sovereign", "this is GDPR-compliant", "this is verified");
- its correctness depends on context the next reader will not have.

Do not apply it to mechanical operations (renaming, moving, reformatting), to clear and unambiguous instructions from the person, to summaries nobody will build on, or when the person explicitly asks for speed. A claim written into a specification, a report or a message that others will build on is not a summary: it is a decision. Doubt everything and nothing ships; doubt nothing and the wrong thing ships.

## The cycle

Copy this checklist at every cycle and tick as you go:

```
- [ ] THESIS: the decision in two lines + why it matters
- [ ] FACTS: the outside-world facts it rests on, each marked verified (how, when) or unverified
- [ ] ARTIFACT: the smallest reviewable unit + the contract it must satisfy
- [ ] KIND OF DOUBT: reality (test it) or reasoning (have it attacked)
- [ ] DOUBT: reality → refutation criterion written first, test run, raw result quoted; reasoning → context-free reviewer with an adversarial prompt
- [ ] TRIAGE: every objection classified (unclear contract / valid / trade-off / noise)
- [ ] STOP: stop condition met, result announced with its limits
```

### 1. THESIS: name what is at stake

Write the decision in two or three lines, and why being wrong would be expensive:

```
THESIS: "The public procurement bulletin API is free, keyless and reachable from our cloud instance."
STAKE: the whole workflow rests on it; if it blocks datacenter IPs, the architecture changes.
```

If you cannot write it that short, you have an impression, not a decision. Phrase it before scrutinizing it.

### 2. FACTS: the inventory where the holes hide

Under the thesis, list the facts about the outside world it rests on: an API exists and returns this field, this node behaves this way, this tab has this name, this source publishes before this hour, this tool is not already installed. Mark each one **verified** (by what, when) or **unverified**. Every unverified fact is a thesis about reality of its own: test it before attacking the reasoning, because an attack is worthless on false facts.

This is where the holes hide. A decision is rarely wrong in its logic; it is wrong in a fact nobody checked. If the list comes back with every fact "verified" on a decision that depends on the outside world, you did not look hard enough.

### 3. ARTIFACT: the smallest reviewable unit

A context-free reviewer needs the **artifact** and the **contract**, not your reasoning.

- A decision: the proposal in 3 to 5 sentences, plus the constraints it must satisfy.
- A claim: the statement, plus the evidence supposed to support it.
- A workflow, a node, a function: its configuration and what it is supposed to produce, not the whole canvas or file.

Strip your reasoning. If you hand over your conclusions, you get back a validation of your conclusions. For a thesis about reality, see the short path in step 4.

### 4. KIND OF DOUBT: reality or reasoning

This is the fork most review methods forget. When the thesis is about the outside world, **no reviewer can refute it by thinking**: it has to be tested.

- **Thesis about reality** (API, node behavior, existence of a tool, content of a response, quota, publication time) → **test it from the real environment**: a call from the instance, a run with sample data, a read of the official documentation, a search to check that "it does not exist". The evidence is the raw result, not your summary of it. For such a thesis, ARTIFACT and CONTRACT collapse into two lines: the exact statement, and **what observation would refute it, written before running the test**. No reviewer and no second opinion: a fact is settled by the test, not by opinions. If the test cannot be run from here (no access, no account), say so and record the thesis as an untested hypothesis with its risk; a reasoned "probably true" is not a test.
- **Thesis of reasoning** (architecture, arbitration, compliance, design choice) → **have it attacked by a context-free reviewer** (step 5).

Many decisions mix both: test the real part first.

### 5. DOUBT: refute, do not validate

**Context-free reviewer.** In an environment with subagents, spawn one with this prompt, passing the artifact and the contract, **never the thesis**: handing over your conclusion pushes the reviewer to agree with it.

```
You are reviewing this artifact to break it, not to approve it.
Assume its author is more confident than warranted. Hunt for:
- assumptions that are never stated
- inputs, cases or timings it does not handle
- ways it could satisfy the letter of the contract and still fail it
- dependencies, coupling or shared state it hides
- existing work or conventions it duplicates or breaks
- what happens under unexpected or hostile input
Do not approve, do not summarize, do not soften. Return problems,
or say plainly that you found none after a thorough search.

ARTIFACT: ...
CONTRACT: ...
```

**Without subagents** (web chats, most assistants): the context-free reviewer does not exist. Run the degraded mode and **say so**: rewrite the artifact and contract in a separate block, then attack it with the prompt above as if you were seeing it for the first time. You carry your own context with you, so the result is worth less; flag it, and offer the person a review by another model or a human if the stakes justify it. An announced degraded doubt beats a silently skipped one.

**Second opinion from another model.** A single model shares its blind spots with the author. When the stakes are high, offer the person an external second opinion (another model, a colleague). They decide, because they carry the cost and the consequences; never run it without their agreement, and never skip the step silently: announce "second opinion not requested" or "not available".

### 6. TRIAGE: objections are data, not a verdict

You remain accountable. Reread the artifact against each objection before classifying it; rubber-stamping the reviewer is the same failure as ignoring it. Classify in this order, the first matching class wins:

1. **Unclear contract**: the objection comes from an incomplete or ambiguous contract. Fix the contract first, reclassify on the next cycle.
2. **Valid and actionable**: a real problem. Fix the artifact, run another cycle.
3. **Valid trade-off**: a real problem, but fixing it costs more than accepting it. Write the trade-off down so the person sees it.
4. **Noise**: the reviewer was wrong for lack of context. Note it, and ask whether that context should have been in the contract.

A real objection about a fact of the outside world fits none of these classes until it has been tested: go back to step 4.

### 7. STOP: a bounded loop

Stop when the next cycle returns only trivial or already-handled objections, when three cycles are done (escalate to the person, do not grind a fourth alone), or when the person says "go". If after three cycles the reviewer still finds substantive problems, the artifact is probably not ready: that is information, not a reason to continue. If three cycles are "obviously insufficient", the artifact is too big: split it.

Always announce the result with its limits, so the person knows exactly what was and was not verified: what was tested, what was attacked, in full or degraded mode, what was accepted as a trade-off, what remains open.

## What it changes concretely

- Before building on an API or a source: a test call from the real environment, and read the raw response.
- Before claiming "it does not exist" or "we need to create it": a search for what exists, with the date.
- Before qualifying a stack ("sovereign", "free", "keyless"): check every component, not just the main one.
- Before activating anything that sends or writes: a run with sample data, with no real sends.
- Before saying "it matches the specs": the traceability check from `hostile-review`, in both directions.
- Before writing "verified" in a document: name what was observed, when, and how many times.
- After writing a long, confident answer: reread it as an artifact. Your own answers are non-trivial decisions when the person is about to build on them.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "I'm sure, no need to doubt this one" | Being sure is a feeling; on a new problem it tracks correctness badly. The moments of certainty are where the blind spots sit. |
| "Testing takes time" | A test call takes ten seconds. Finding out in use that the assumption was false costs the design. |
| "The reviewer will only nitpick" | Only if the prompt is loose. Bound it to "problems that would make the contract fail". |
| "No subagent here, so no doubt" | The degraded mode exists. A doubt announced as degraded beats an absent doubt. |
| "The reviewer found nothing, so it's fine" | Check that it was asked to find problems rather than to summarize. "None found" only means something when finding was the task. |
| "The reviewer objected, so I was wrong" | It lacks your context. An objection is data to triage, not a verdict. |
| "I already checked something similar" | Similar is not identical. Every fact about the world is tested on its own. |
| "One observation is enough to write 'verified'" | One observation shows it happened once. Write what was seen, when, and how often, before calling it verified. |
| "I'll doubt at the end, in review" | The final review judges too late, when fixing is expensive. Doubt is practiced decision by decision. |

## Red flags

- A doubt cycle on a rename or a node move.
- A thesis about an API, a product or a source "refuted" by reasoning alone, with no test.
- A FACTS list with no unverified item on a decision that depends on the outside world.
- "Verified" written from a single observation without saying so.
- A reviewer prompt asking "is this good?" instead of "find the problems".
- The thesis handed to the reviewer along with the artifact.
- Two or more cycles with substantive objections and none classified as actionable: you are validating, not doubting. Stop and escalate.
- A degraded mode not announced.
- An external second opinion launched without the person's explicit agreement.
- More than three cycles without escalating to the person.
- A confident answer delivered to the person without having been reread as an artifact.
