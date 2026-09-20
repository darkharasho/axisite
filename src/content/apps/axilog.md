---
name: axilog
tagline: A fast, cross-platform parser for arcdps combat logs.
category: combat-logs
status: stable
repo: darkharasho/axilog
platforms: [windows, linux, mac]
icon: axilog.png
---

axilog is a fast, cross-platform combat-log parser for Guild Wars 2 arcdps logs, built as a Rust parsing core with a CLI, a Node SDK, and a Python SDK as native extension modules rather than subprocess wrappers. Point it at a `.zevtc` and get back structured JSON, a terminal table, CSV, or a single-file interactive HTML report, covering damage and down contribution, CC and stun breaks, boon uptime, cleanses and strips, healing and barrier, and combat-replay position tracks. A real 583k-event WvW log parses and fully analyzes in about 174 ms, single-threaded.
