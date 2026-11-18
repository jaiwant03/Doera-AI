# DOERA AI — Frontend Application

Premium startup-quality conversational interface for **DOERA AI**: an autonomous real-world task execution assistant.

"Don't just ask AI. Let AI get it done."

## Core Features

- **Conversational Task Interface**: Simple, distraction-free conversational experience (not a complex dashboard).
- **Design System**:
  - Primary Background: `#FFFFFF`
  - Secondary Background: `#F7F9FC`
  - Primary Accent: Peacock Blue (`#087F8C`)
  - Secondary Accent: Rama Green (`#15966A`)
  - Supporting Accent: Soft Violet (`#8065D9`)
  - Text: Dark Charcoal (`#202633`)
  - Primary Font: **Times New Roman**
- **Dynamic Task Execution Visualization**: Live inline activity showing:
  - Current Agent (Orchestrator, Discovery, Communication, Quotation, Scheduling, Verification, Recovery)
  - Current Action
  - Step progress indicators
  - Human Authorization Gate (Approve / Reject)
  - Task cancellation and recovery options
- **Multi-Modal Input**:
  - Voice recognition supporting English, Tamil, and Tanglish.
  - Attachment upload with file preview chips.
  - Keyboard shortcuts (Enter to execute, Shift+Enter for newline).
- **Real-Time Updates**: WebSocket integration for instant step-by-step progress and status updates.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```
