---
name: arcdps_axipulse
tagline: An arcdps plugin that runs Elite Insights on every fight and renders WvW stats in-game.
category: combat-logs
status: beta
repo: darkharasho/arcdps-axipulse
platforms: [windows]
---

arcdps_axipulse is a Rust arcdps plugin that runs the bundled Elite Insights CLI against each `.evtc` your client writes, parses the JSON output, and renders WvW combat overlays in-game. Its Pulse tab rolls the latest fight into squad-relative stats — DPS and squad rank, down contribution, strips, cleanses, and damage taken — while a Timeline tab shows time-aligned tracks for health, damage, and boons, and a Map tab replays the fight on the WvW map with player positions and camera controls.
