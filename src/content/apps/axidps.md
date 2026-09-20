---
name: axidps
tagline: Real-time GW2 combat metrics read straight from the game's memory.
category: combat-logs
status: wip
platforms: [windows]
hidden: true
---

axidps is a Guild Wars 2 combat metrics system that captures combat data from the game's memory in real time. A DLL hooks GW2's combat log function via pattern scanning and function detours, streams the data through a shared-memory ring buffer to an Electron app, which processes DPS and other metrics, exports ArcDPS-compatible EVTC logs, and streams live data over WebSocket.
