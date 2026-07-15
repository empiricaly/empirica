# Legal review brief — data deletion & withdrawal design

Audience: external counsel / institutional privacy officer.
Subject: Empirica v3 (open-source platform for online behavioral experiments run by
academic labs; participants recruited via platforms like Prolific; deployments are
operated by the researchers themselves, typically under IRB protocols).
Full technical spec: [specs/redaction.md](specs/redaction.md); storage model:
[05-storage.md](05-storage.md).

We ask counsel to confirm (or correct) four positions the design takes. Each is
changeable now at low cost; after implementation, changes are expensive.

## Position 1 — Redaction = content destruction + identity unlinking

On withdrawal/erasure request, the system, in one transaction: (a) deletes all
external identifiers (recruitment-platform IDs, email) — the internal random ID
becomes, in our view, no longer reasonably linkable to a natural person; (b)
overwrites every value the participant expressed (survey answers, chat text,
decisions, free text embedded in logs/effect payloads) with tombstones; (c) revokes
all their credentials. **Preserved**: the pseudonymous internal ID, event counts,
timestamps, sequence/structure of their actions (not contents), and group topology.

*Question: is (a)+(b) adequate as GDPR Art. 17 erasure (and CCPA deletion), given
the preserved structural residue? Is the "no longer personal data after identity
deletion" stance defensible, or must structural rows go too?*

## Position 2 — Aggregates and other participants' data are not recomputed

Values other participants legitimately received during the session (group totals,
averages, outcomes influenced by the withdrawn player) remain. The consent template
will state this.

*Question: adequate under Art. 17(3) / research exemptions? Required consent
language?*

## Position 3 — Collaborative artifacts are collective works

For co-authored CRDT documents (shared essays, whiteboards), default behavior:
document content survives; the withdrawn participant's authorship attribution is
removed. A per-deployment strict mode destroys entire documents they touched.
Consent template discloses the default.

*Question: is attribution-removal sufficient for co-authored content, or must
jurisdictions we care about get the strict mode by default?*

## Position 4 — Backups age out rather than being rewritten

Encrypted-at-rest offsite backups (point-in-time WAL streams) contain pre-redaction
bytes. On redaction the system starts a fresh backup generation; prior generations
expire with the deployment's declared retention window (default 30 days). Erasure is
documented to complete when retention lapses. Backups are not individually rewritten.

*Question: is bounded-retention completion acceptable (it is common industry
practice), and what must the privacy notice / consent language say about the window?*

## Also requested

- Review of the stock consent template's clauses covering: positions 1–4, the
  payment ledger retaining pay records post-withdrawal (identifier-only reasons,
  no content), and session replay (admin-only, respects redaction).
- Whether a Data Processing Addendum template should ship for labs whose
  institutions demand one (researcher = controller; lab's host = processor; the
  software vendor is not a party — we never hold data).
- Jurisdiction scope to design for: GDPR + UK GDPR + CCPA as the baseline; flag
  anything else commonly triggered by academic online-subject pools.

## Timeline & contact

The redaction spec is the only design document blocked on this review. Everything
is negotiable pre-implementation; the engineering cost of stricter answers is known
and acceptable (strict collab mode exists; structural deletion would cost replay
integrity and is the one answer we'd push back on — we'd want to discuss Art. 89
research safeguards first).
