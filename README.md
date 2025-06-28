# TabVault - Chrome Extension

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh.md)

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v2.0.0-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension Manifest](https://img.shields.io/badge/Manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-lightgrey?logo=github)](https://github.com)
[![Security](https://img.shields.io/badge/Security-AES--256%20Encrypted-brightgreen.svg)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
[![Sync](https://img.shields.io/badge/Sync-GitHub%20Gist-orange.svg)](https://gist.github.com)
[![Auto-Save](https://img.shields.io/badge/Auto--Save-1--60%20min-blue.svg)](https://developer.chrome.com/docs/extensions/)

A powerful Chrome extension for automatically saving and restoring browser sessions with cross-device synchronization. Built with modern web technologies and designed for seamless user experience.

**TabVault** - Where your tabs are safely stored and synchronized across devices. The name combines "Tab" (browser tabs) with "Vault" (secure storage), representing our commitment to keeping your browsing sessions secure and accessible anywhere.

## Overview
![Frame](https://github.com/user-attachments/assets/c695baaa-0a59-4645-9909-84300b931ef8)

[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-blue?logo=github-sponsors)](https://github.com/sponsors/blue-b)

TabVault automatically saves your browser sessions at configurable intervals, allowing you to restore them later across different devices. The extension uses GitHub Gist for cloud synchronization with end-to-end encryption, ensuring your data remains private and secure.

**Smart Auto-Save** automatically saves your browser sessions every 5 minutes by default, but you can adjust this interval from 1 to 60 minutes. **Manual Save** lets you instantly save your current session with one click or using the Ctrl+S keyboard shortcut.

**Cross-Device Sync** seamlessly synchronizes your sessions across devices using GitHub Gist. All data is encrypted before being uploaded to the cloud, and the extension falls back to local storage when cloud sync is unavailable.

## Features

**Session Management**: Choose specific tabs or restore entire sessions. The extension supports bulk operations, allowing you to select multiple sessions for batch deletion or management.

**Advanced Filtering**: Search and filter tabs by URL or title to quickly find what you're looking for in large session collections.

**Security**: All session data is encrypted using AES-256 before being stored in the cloud. The extension works completely offline with local storage when cloud sync is unavailable.

**Real-time Status**: Live sync status indicators, session counts, and storage usage monitoring with instant feedback.

**Keyboard Shortcuts**: Quick access with Ctrl+S for manual save and customizable hotkeys for common actions.

**Session Preview**: Detailed view of saved sessions with tab thumbnails and metadata before restoration.

**Smart Cleanup**: Automatic management of storage limits with intelligent session pruning and duplicate detection.

**Cross-Browser Support**: Works with Chrome, Chromium, and Edge (Chromium-based) for maximum compatibility.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Background     │    │  Content        │
│                 │    │   Script        │    │  Scripts        │
│ • Session List  │◄──►│                 │◄──►│                 │
│ • Settings      │    │ • Auto-save     │    │ • Tab Info      │
│ • Sync Status   │    │ • Data Mgmt     │    │ • Page Access   │
│ • Bulk Actions  │    │ • Encryption    │    │ • Minimal       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Chrome Storage  │    │ GitHub Gist     │    │ Local Storage   │
│                 │    │                 │    │                 │
│ • Sync Data     │    │ • Cloud Sync    │    │ • Offline Mode  │
│ • Settings      │    │ • Encrypted     │    │ • Fallback      │
│ • Session Cache │    │ • Versioned     │    │ • Backup        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation

### From Chrome Web Store
[Chrome Web store TabVault](https://chromewebstore.google.com/detail/tabvault-%EB%B3%B4%EC%95%88-%ED%83%AD-%EA%B4%80%EB%A6%AC%EC%9E%90/idilkfhikhppjciebljbfeejidkfalmd?authuser=0&hl=ko&pli=1)
1. Visit the Chrome Web Store
2. Search for "TabVault"
3. Click "Add to Chrome"

### Manual Installation
1. Download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Getting Started

After installing the extension, you can start using it immediately in local mode without any configuration. The extension will work offline and save your sessions locally. For cross-device synchronization, you'll need to configure GitHub sync by following these steps to set up your GitHub Personal Access Token:

### Setting up GitHub Personal Access Token

1. **Go to GitHub Settings**
   - Visit [GitHub.com](https://github.com) and sign in to your account
   - Click on your profile picture in the top-right corner
   - Select **Settings** from the dropdown menu

2. **Access Developer Settings**
   - Scroll down to the bottom of the left sidebar
   - Click on **Developer settings** (located at the very bottom)

3. **Create Personal Access Token**
   - Click on **Personal access tokens** in the left sidebar
   - Select **Tokens (classic)**
   - Click **Generate new token (classic)**

4. **Configure Token**
   - Give your token a descriptive name (e.g., "TabVault Extension")
   - Set expiration as needed (recommended: 90 days or custom)
   - **Important**: Only check the **gist** permission - this is all the extension needs
   - Click **Generate token**

5. **Copy and Secure Your Token**
   - **Copy the generated token immediately** - you won't be able to see it again
   - Store it securely in a password manager or secure location
   - **Never share this token publicly** - it provides access to your GitHub Gist

6. **Configure the Extension**
   - Click the TabVault extension icon in your browser
   - Go to **Settings** → **GitHub Configuration**
   - Paste your GitHub Personal Access Token
   - Click **Save** to complete the setup

**⚠️ Security Warning**: Keep your GitHub Personal Access Token secure and never share it publicly. If you accidentally expose your token, immediately revoke it in GitHub settings and generate a new one.

### Using the Extension

**Local Mode (Default)**: The extension works immediately after installation without any configuration. Auto-save is disabled by default - you can enable it in settings if desired. All sessions are saved locally on your device.

**Cloud Sync Mode**: After setting up your GitHub token, you can enable auto-save and cloud synchronization. Auto-save will save your sessions at configurable intervals (1-60 minutes) when enabled in settings.

To save your current session manually, simply click "Save Now" in the extension popup or press Ctrl+S. All saved sessions appear in the main interface where you can restore them with a single click.

## Configuration

The extension uses GitHub Gist for cloud synchronization, providing each user with a dedicated Gist for session storage. Maximum 20 sessions per account are stored by default, but this is configurable.

Auto-save settings allow you to set intervals from 1 to 60 minutes, with triggers that activate when the browser is active. The extension automatically manages storage limits and cleans up old sessions.

Security options include AES-256 encryption for all cloud data, complete offline operation in local mode, and secure GitHub token storage.

## Technical Details

The extension architecture consists of a background script that handles auto-save and data management, a popup interface for the main user interface, and content scripts with minimal footprint and no page injection. Storage is handled through the Chrome Storage API with cloud sync capabilities.

Browser compatibility includes Chrome 88+, Chromium 88+, and Edge 88+ (Chromium-based).

## Troubleshooting

If auto-save isn't working, check if it's enabled in settings, verify browser permissions, and check the background script in Chrome DevTools.

For sync issues, verify your GitHub token is valid, check your internet connection, and review GitHub API rate limits.

If sessions aren't appearing, try refreshing the extension popup, check local storage in DevTools, or verify GitHub Gist access.

## Development

To build from source, clone the repository and load it as an unpacked extension. No build process is required as it uses pure JavaScript, HTML, and CSS.

Contributions are welcome. Fork the repository, create a feature branch, make your changes, test thoroughly, and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

Report bugs on GitHub Issues, join community discussions, or check the wiki for detailed guides.

## Changelog

**v2.0.0 (Current)**
- Complete UI redesign with modern interface
- Enhanced session management with bulk operations
- Improved GitHub Gist integration
- Added encryption for cloud data
- Performance optimizations

**v1.0.0**
- Initial release with basic functionality
- Local storage support
- Manual save/restore features

---

**TabVault** - Never lose your browsing sessions again. 
