# n8n pitfalls to check in a hostile review of an implementation

Drawn from real projects. Each line is a question to ask the workflow under review. Extend it every time a new trap is found.

## Misleading defaults

- **Merge defaults to "Append".** Right for stacking items of the same kind or waiting for several branches, wrong for enriching one item with another (that needs "Combine"). A Merge left on Append in front of an AI node gives it two separate items instead of one complete item.
- **Merge with an empty branch.** If one branch yields no items (no appointment published that day), check that the Merge lets the other branch through and that the output (email, write) still happens.
- **Gmail appends "sent automatically with n8n"** to every email until the attribution option is disabled.
- **Default AI model.** Model nodes often preselect a small model. Check that every AI node has a model chosen for its task (short and frequent: small model; reasoning over a lot of context: large model).
- **A filter that looks at a single item.** A condition such as "keep the best ones if none reaches the threshold" must look at the whole set, not just the current item. Check the expression.

## Structure and naming

- **Forced nodes.** Two requests to the same source only to justify a Merge, a Merge on Append whose real join is hidden inside a Code node: an attentive reviewer sees the difference between a useful node and a node placed to tick a box.
- **Large Code node.** More than 20 lines doing normalization, filtering and deduplication at once: maintainable by one profile only. Either justified explicitly (one pass over all the data) or split into native nodes.
- **Nodes left with default names** ("Gmail", "IF", "Set"): an unnamed flow is not self-documenting.
- **Structural settings inside a "zero configuration" skeleton** (number of Merge inputs, named Switch outputs, an agent's Output Parser input): acceptable, but flag them so they are not mistaken for configuration.

## Data, configuration and dates

- **Google Sheets tab name with an apostrophe** ("Appels d'offres"): the n8n Google Sheets trigger fails on it. Rename without the apostrophe and document it.
- **Deduplication key on non-normalized fields.** If two sources use different identifiers, Remove Duplicates must run after normalization, not before.
- **Discarded items not recorded.** A pre-filter that eliminates before writing makes any review of false negatives, and any "nothing missed" indicator, impossible.
- **Configuration read from a spreadsheet tab (filters, weights, watch lists).** An empty or renamed tab must stop the run with an alert, not silently produce zero results or zero scores: check what the workflow does when the read returns nothing, or a blank cell.
- **Date-only queries on a source.** "Published since D" with a date, not a timestamp, misses items back-dated to D−1 after the run, and sources add items during the day (BOAMP does). Query from D−1 and let deduplication absorb the overlap.
- **Derived lists that feed the score.** A "buyers of interesting items over 12 months" list computed from the AI's own recommendations is a feedback loop: derive it from human decisions or from a maintained list.
- **Values computed and dropped.** A justification or a sub-score produced by the AI and not written anywhere is invisible to the people who must trust the result.

## Credentials and settings outside nodes

- **The Google Sheets trigger has its own credential**, separate from the Google Sheets one. Same account, two connections.
- **The "Error Workflow" setting** lives in the workflow settings, not in a node. Without it, an error workflow never fires. An Error Trigger node inside the workflow itself works without the setting, but only on automatic executions, never on manual runs.
- **A Gmail alert will not go out if Gmail itself is down.** Check that at least one alert channel does not depend on the monitored component, or accept it explicitly.
- **A sub-workflow must be published before its callers**, otherwise the call fails.
- **Retry on Fail**: present on every external call? With what delay? A source that fails three times in five seconds had no time to recover.

## Security

- **External text in a prompt.** An announcement, a press release or an incoming email is given to the AI as data, in a dedicated tag or field, never concatenated into the instruction.
- **External values in generated HTML.** A URL or a title from a source inserted into an email without escaping can break the markup or inject an attribute.
- **Webhook without authentication.** Any action (decision, paid generation) triggerable by URL must require identification, otherwise a forwarded link is enough.
- **Resource identifiers in a public repository** (spreadsheet id, email addresses, instance URL). Not a vulnerability by itself, but needless exposure: private repository or variables.
