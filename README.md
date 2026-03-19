# Chronicle Mobile

Mobile companion for Chronicle - capture notes on the go, sync via git.

## Why?

Ideas don't wait for you to be at your desk. Chronicle Mobile lets you capture quick notes, markdown and all, then syncs them to your desktop vault via git.

## Features

- **Quick Capture** - Single-tap new note, voice input, photo attachments
- **Markdown Editor** - Full markdown support with live preview
- **Git Sync** - Clone your vault, pull updates, push changes
- **Offline First** - Works without network, syncs when connected
- **Secure** - Biometric/PIN lock, encrypted credentials

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Setup

1. Open the app
2. Enter your git remote URL
3. Authenticate (SSH key or token)
4. Wait for initial clone
5. Start capturing notes

## Tech Stack

- React Native + Expo
- Expo Router for navigation
- isomorphic-git for sync
- SQLite for local storage
- Zustand for state management

## License

MIT

---

*Part of the Chronicle ecosystem.*
