YT AUDIO DOWNLOADER
==================

A simple, cross-platform desktop application for extracting audio from
YouTube and similar platforms.

Built with Electron and Vue, and powered by yt-dlp and FFmpeg.

This project is free, open source, and intended for personal and
educational use.

------------------------------------------------------------

FEATURES
--------

• Extract audio from videos (MP3, OPUS, FLAC)
• Choose custom output folders
• Download queue with progress tracking
• Cancel and retry downloads
• Reveal completed files in your file manager
• Fully self-contained at runtime (bundles yt-dlp and FFmpeg into builds)
• Linux AppImage support
• macOS DMG support (Intel & Apple Silicon)

------------------------------------------------------------

IMPORTANT: BINARIES ARE NOT COMMITTED TO GITHUB
-----------------------------------------------

This repository does NOT include the yt-dlp and FFmpeg binaries by default.
They are excluded to keep the repo small and avoid committing large
third-party executables.

Before running the app in dev mode OR building release artifacts, you MUST
fetch the required binaries using the provided scripts.

Binaries are downloaded into:

  resources/bin/linux-x64/
  resources/bin/darwin-x64/
  resources/bin/darwin-arm64/

------------------------------------------------------------

FETCH BINARIES (REQUIRED)
-------------------------

1) Fetch FFmpeg binaries:

   ./scripts/fetch-ffmpeg-binaries.sh

2) Fetch yt-dlp binaries:

   ./scripts/fetch-yt-dlp-binaries.sh

Make sure scripts are executable:

   chmod +x scripts/fetch-ffmpeg-binaries.sh scripts/fetch-yt-dlp-binaries.sh

Verification (optional):

   resources/bin/linux-x64/yt-dlp --version
   resources/bin/darwin-x64/yt-dlp --version
   resources/bin/darwin-arm64/yt-dlp --version

------------------------------------------------------------

INSTALLATION
------------

LINUX (AppImage)

1. Download the latest .AppImage from the Releases page
2. Make it executable:

   chmod +x YT-Audio-Downloader.AppImage

3. Run it:

   ./YT-Audio-Downloader.AppImage

If your system reports a missing libfuse.so.2, install:

   sudo dnf install fuse-libs


MACOS (DMG)

1. Download the .dmg file
2. Drag the app into /Applications
3. On first launch, approve it in:
   System Settings → Privacy & Security

------------------------------------------------------------

USAGE
-----

1. Paste one or more video URLs
2. Choose an output folder and audio format
3. Click “Add to Queue”
4. Downloads begin automatically



------------------------------------------------------------

DEVELOPMENT
-----------

Requirements:
• Node.js 18+ (Node 20 LTS recommended)
• npm

Setup:

   npm install

IMPORTANT: Fetch binaries before running dev:

   ./scripts/fetch-ffmpeg-binaries.sh
   ./scripts/fetch-yt-dlp-binaries.sh

Run dev:

   npm run dev

------------------------------------------------------------

BUILDING RELEASE ARTIFACTS
--------------------------

IMPORTANT: Fetch binaries before building, otherwise the packaged app will
fail at runtime (ENOENT when trying to spawn yt-dlp/ffmpeg).

   ./scripts/fetch-ffmpeg-binaries.sh
   ./scripts/fetch-yt-dlp-binaries.sh

Build (Linux AppImage):

   npm run build:appimage

Build (macOS DMG):

   npm run build:mac

Build macOS (explicit arch):

   npm run build:mac:x64
   npm run build:mac:arm64

------------------------------------------------------------

BUILT WITH
----------

• Electron
• Vue 3
• electron-vite
• yt-dlp
• FFmpeg

------------------------------------------------------------

LICENSING & ATTRIBUTION
-----------------------

This project is released under the MIT License.

This application bundles the following open-source tools:

yt-dlp
License: Unlicense
Source: https://github.com/yt-dlp/yt-dlp

FFmpeg
License: LGPL 2.1+ (or GPL, depending on build)
Source: https://ffmpeg.org

FFmpeg is used as an external executable and is not statically linked
into this application.

See NOTICE.txt for third-party attribution details.

------------------------------------------------------------

LEGAL NOTICE
------------

This software is provided for personal and educational use only.

You are responsible for ensuring that your use of this software complies
with:

• The terms of service of any websites you access
• Local copyright laws in your jurisdiction

The authors of this project do not encourage or condone copyright
infringement.

------------------------------------------------------------

CONTRIBUTING / BUG REPORTS
--------------------------

Bug reports and feature requests are welcome via GitHub Issues.

When reporting a bug, please include:
• OS + version
• App version
• Installation method (AppImage / DMG)
• Steps to reproduce
• Any logs/screenshots

------------------------------------------------------------

LICENSE
-------

MIT License — see LICENSE file for full text.
