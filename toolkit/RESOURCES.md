# Reverse-engineering resource library (work in progress)

A curated starting point, not an exhaustive list or a bundled tool distribution. Start with the spreadsheet method and the smallest lawful experiment. Tool versions, security advisories and licenses change: use official release instructions and review the license before redistributing anything. These links do not imply endorsement by their maintainers.

## Learn and record

| Resource | Why it is useful | How it fits this method |
| --- | --- | --- |
| [The Rust Programming Language](https://doc.rust-lang.org/book/) | Rust fundamentals and testing | Implement original generic behavior, not literal decompiler translations |
| [Cargo Book](https://doc.rust-lang.org/cargo/) | Reproducible Rust projects and tests | Keep executable checks beside the specification |
| [Pro Git](https://git-scm.com/book/en/v2) | Version control and review | Track workbook/schema changes and evidence provenance |
| [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) | Repository licensing basics | Public visibility alone does not grant reuse rights |

## Observe and analyze authorized software

| Resource | Purpose | Boundary |
| --- | --- | --- |
| [Ghidra](https://github.com/NationalSecurityAgency/ghidra) | Static analysis, disassembly, decompilation, scripting | Decompiler output is approximate and may be protected material. Do not copy it into a supposedly independent implementation |
| [The radare2 book](https://book.rada.re/) | Binary inspection and analysis concepts | Use your own or authorized samples and document findings as hypotheses |
| [x64dbg documentation](https://help.x64dbg.com/) | Windows debugging | Useful for your own executable's state transitions and controlled observations |
| [GDB manual](https://sourceware.org/gdb/current/onlinedocs/gdb.html/) | Source and machine-level debugging | Prefer original small programs to establish a measurement technique |
| [Wireshark user guide](https://www.wireshark.org/docs/wsug_html_chunked/) | Understand traffic from systems you control | Captures may contain credentials and other people's data. Sanitize or keep private; never post raw captures by default |

These tools are references, not installed dependencies of the spreadsheet starter. This guide does not cover bypassing access controls, DRM or anti-cheat, compromising services, or collecting other people's traffic. Research and redistribution must stay within your permissions and applicable rules.

## Spreadsheet and documentation pipeline

| Resource | Purpose | Current use |
| --- | --- | --- |
| [openpyxl docs](https://openpyxl.readthedocs.io/en/stable/) | Read/write XLSX in Python | Used by the runnable starter; authoritative cells must be literals |
| [Calamine docs](https://docs.rs/calamine/) | Rust spreadsheet reader | Used by the experimental native Jcode draft, not the Python starter |
| [Typst JSON reference](https://typst.app/docs/reference/data-loading/json/) | Generate reports from structured data | Optional: format the generated matrix instead of hand-copying workbook values |
| [Jcode upstream](https://github.com/1jehuang/jcode) | Coding assistant source and project guidance | Native workbook changes here are a draft snapshot, not an official release |

## Safe first exercise

1. Write your own tiny timer/cooldown program with two or three known states.
2. Observe it without looking at the implementation and log the input/output sequence.
3. Put the observations and uncertainties in the Evidence sheet.
4. Model the supported rule and build a small independent implementation.
5. Compare both through the same original test cases, including boundaries.
6. Document where the spreadsheet helped and where an engine test was still necessary.

That exercise teaches observation, falsifiable hypotheses and data-driven implementation without redistributing another developer's game.

## Research/provenance notes

The Python scaffold and spreadsheet-first instructions reuse Drew's existing generic project scaffold, with publication-safe synthetic examples, no-overwrite template creation, formula rejection and atomic/check-mode output added here. The native draft retains upstream MIT attribution and a hash manifest. Official Ghidra and openpyxl pages were consulted during packaging on 2026-09-30. Other links are official reference entry points, not claims that every example or tool release has been tested. No manuals, executable tools, third-party libraries or commercial game data are vendored by this guide.
