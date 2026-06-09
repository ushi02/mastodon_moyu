# mastodon_moyu

Built with Tauri, SvelteKit, and TypeScript.

## TUI Prototype

This repo now also includes a minimal terminal reader prototype aimed at low-profile, keyboard-first Mastodon reading.

Run it with:

```bash
npm run tui
```

Show the terminal keymap and state-file location with:

```bash
npm run tui:help
```

Design notes:

- The TUI is implemented in Node with no extra runtime dependencies.
- It reuses the existing TypeScript Mastodon API layer from `src/api`.
- State is persisted to a local JSON file so the current timeline and reading position survive quick open/close cycles.

