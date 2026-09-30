# The spreadsheet method: evidence first, implementation second

**Development guide, not a claim of complete recovery.** This method turns observations into a versioned specification that humans, Jcode, tests and an engine can share. A spreadsheet is not a decompiler, and a generated matrix is not proof of parity.

## 1. Establish scope and permission

Start with a program you created, an appropriately licensed project, or work you are authorized to analyze. Write down the exact version, platform, relevant license and scope. Separate a behavioral specification from protected implementation and assets. Do not upload proprietary binaries, disassembly, textures, audio, private captures, credentials, or extracted source to this repository. Applicable law, agreements and exceptions vary. Get qualified advice when needed, particularly before redistribution. Calling something a port, parody or clean-room reimplementation is not a legal determination.

For genuinely independent implementations, consider separate observation/specification and implementation roles, with documented permitted inputs. Simply using separate folders or languages is not sufficient to establish a legally clean process.

## 2. Pick one observable behavior

Start small: a cooldown, inventory limit, input transition or file-format field. Record the target build and environment. Change one input at a time, repeat the measurement, include boundaries, and distinguish deterministic behavior from noise. Keep raw evidence privately when it cannot be redistributed. Publish a rights-cleared written description and non-sensitive identifier instead.

Use an Evidence row for each claim:

| Column | Record |
| --- | --- |
| evidence_id | Stable ID such as EVD_COOLDOWN_001 |
| target_id | The proposed entity, field or rule ID |
| status | observed, hypothesis, contradicted, unknown, or illustrative |
| observation | A plain-language claim, including units and uncertainty |
| source | A permitted reference or private evidence label, never a secret |
| version | Exact build/platform or an immutable original-test version |
| procedure | Initial state, inputs, timing method and repetitions |
| expected / observed | Expected result versus actual measurement |
| test_id | Regression test that would verify or falsify the claim |

The supplied Evidence sheet is a **human ledger**. This version does not validate or export it. Do not mistake a note for a validated runtime rule.

## 3. Promote supported facts into the model

Use `Entities` for things, `Fields` for typed values and units, and `Rules` for supported generic behavior. Keep IDs permanent: names may change, IDs must not be reused for unrelated meanings. Document unknowns rather than silently inventing a constant. Reference the evidence in a description or ledger row and review before promotion.

Example, entirely synthetic: our own toy program refuses a second action until 1.2 seconds after the first. Record trials at 1.19, 1.20 and 1.21 seconds with a defined tolerance. Only after checking boundaries should FLD_HATCHET_COOLDOWN=1.2 enter the model. The starter's existing 1.2 is merely an illustrative value, not evidence about a real game.

## 4. Generate, do not hand-copy

```text
python scripts/build_matrix.py
python scripts/build_matrix.py --check
```

Run these from the spreadsheet starter directory. Fix duplicate IDs, broken references and invalid literals in the workbook. Do not edit generated JSON. Commit the authored workbook and schema. If your own project commits the generated matrix, use the check command in CI. This repository ignores its generated example output and rebuilds it in tests.

The Python and native Jcode draft use different workbook contracts. Follow the documentation for the tool you are actually running. The native draft is not assumed to be present in a released Jcode installation.

## 5. Implement generic behavior, not duplicated rows

Have engine code look up a field or rule by ID. Implement shared semantics once, and keep per-instance values in the workbook. A new rule type needs schema validation, engine support, documentation and tests together. The current validator checks structural references and values, not every cross-field or runtime semantic constraint.

Use the included AGENTS.md in a spreadsheet-backed project. A useful Jcode task is:

> Read AGENTS.md and the model contract. Rebuild the matrix before changing code. Implement only the generic cooldown behavior for the referenced IDs. Do not modify authored workbook values without approval. Add boundary tests linked to the evidence ledger. Report unsupported claims and measured results separately.

Only load the rows and evidence relevant to the task. Do not feed an entire private workbook to a model by default. AI-generated names, inferred semantics and decompiler output are hypotheses until checked.

## 6. Verify the actual behavior

Test both ordinary and boundary cases through the real engine interface. Compare state transitions, timing tolerances and error behavior with the approved specification. A passing workbook check proves data consistency, not runtime equivalence. A mocked test does not prove real network/client behavior. Keep a failing regression example where practical, then show the real fix makes it pass.

## 7. Publish the smallest reviewable change

Include the evidence summary, workbook change, schema impact, generated-data policy, tests, limitations, provenance and license notices. A second reviewer should be able to repeat the measurement without guessing. Do not bundle third-party content just because it was useful while investigating. Record what remains unknown and mark incomplete tooling as experimental.
