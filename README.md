# Rustic Viewer

An experimental image viewer application with Tauri, React

## Goals

- Optimize image loading speed to be as fast as possible
- **Conduct experiments, gain experience**

## Features

- 🖼️ **Multiple Image Format Support**: Supports PNG, JPG, JPEG, GIF, BMP, and WebP
- 📑 **Tab-Based Interface**: Open and manage multiple images simultaneously
- 🔀 **Comparison View**: Display multiple images side-by-side for comparison
- ⚡ **High-Performance Rendering**: Leverages Canvas API and Web Workers for optimal performance

## Prerequisites

- Node.js
- pnpm
- Rust

## Installation

```bash
# Clone the repository
git clone https://github.com/BlueGeckoJP/rustic-viewer.git
cd rustic-viewer

# Install dependencies
pnpm install
```

## Development

```bash
# Start the development server
pnpm tauri dev
```

## Build

```bash
# Build for production
pnpm tauri build
```

The built application will be output to `src-tauri/target/release`.

> [!TIP]
> If an error occurs with the `strip` command during AppImage building in any Linux environment, please try running the following command.
>
> ```sh
> NO_STRIP=true pnpm tauri build
> ```

## Usage

### Basic Operations

- **Open Image**: `Ctrl+O` or File > Open from menu
- **New Tab**: `Ctrl+N` or File > New from menu
- **Quit Application**: `Ctrl+Q` or File > Quit from menu

### Navigation

- **Next Image**: Right arrow key
- **Previous Image**: Left arrow key
- **Switch Tabs**: Click on the tab bar

### Comparison View

Create a comparison tab by selecting multiple single tabs to view images side-by-side.

## Tech Stack

### Frontend

- **React**: UI Framework
- **TypeScript**: Type-safe development
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Vite**: Build tool

### Backend

- **Tauri**: Desktop application framework
- **Rust**: System-level processing

### Development Tools

- **Biome**: Linter & Formatter
- **Jest**: Testing framework
- **Testing Library**: Component testing

## Project Structure

```txt
rustic-viewer/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── store/             # Zustand state management
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── src-tauri/             # Tauri backend
│   └── src/               # Rust source code
├── public/                # Static assets
└── test-images/           # Test images
```
