# Chronicle Mobile E2E Tests

End-to-end tests using [Maestro](https://maestro.mobile.dev/), a simple and effective mobile UI testing framework.

## Setup

### Install Maestro

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or with Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

### Start the app

```bash
# Start Expo development server
npx expo start

# In another terminal, start iOS simulator or Android emulator
# iOS: Open Xcode > Window > Devices and Simulators
# Android: Start via Android Studio or `emulator -avd <name>`
```

## Running Tests

### Run all tests

```bash
maestro test e2e/
```

### Run specific test

```bash
maestro test e2e/flows/onboarding.yaml
```

### Run with specific device

```bash
# iOS
maestro test --device "iPhone 15" e2e/

# Android  
maestro test --device "emulator-5554" e2e/
```

## Test Structure

```
e2e/
├── README.md           # This file
├── config.yaml         # Maestro configuration
├── flows/              # Test flows (main scenarios)
│   ├── onboarding.yaml
│   ├── create-note.yaml
│   ├── sync.yaml
│   └── security.yaml
├── helpers/            # Reusable test components
│   └── common.yaml
└── screenshots/        # Captured screenshots (gitignored)
```

## Writing Tests

Maestro uses YAML to define test flows. See [Maestro docs](https://maestro.mobile.dev/getting-started/writing-your-first-flow) for full reference.

### Example

```yaml
appId: com.chronicle.mobile
---
- launchApp
- tapOn: "Create Note"
- inputText: "My Test Note"
- tapOn: "Save"
- assertVisible: "My Test Note"
```

## CI Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Install Maestro
  run: curl -Ls "https://get.maestro.mobile.dev" | bash
  
- name: Run E2E Tests
  run: |
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test e2e/
```
