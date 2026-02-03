# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run all tests with Vitest
npm test -- path/to/file.test.ts  # Run single test file
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset database (destructive)
```

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, and the AI generates code that renders in a sandboxed preview.

### Core Data Flow

1. **Chat API** (`src/app/api/chat/route.ts`): Receives user messages, invokes Claude via Vercel AI SDK with two tools:
   - `str_replace_editor`: Creates/edits files (view, create, str_replace, insert commands)
   - `file_manager`: Renames/deletes files

2. **Virtual File System** (`src/lib/file-system.ts`): In-memory file system that stores all generated code. No files are written to disk. The `VirtualFileSystem` class handles file CRUD operations with path normalization.

3. **Preview Rendering** (`src/lib/transform/jsx-transformer.ts`): Transforms JSX/TSX files using Babel standalone, creates blob URLs for each file, builds an import map, and generates an HTML document that loads the app via ES modules from esm.sh.

### Context Providers

- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`): Wraps the VirtualFileSystem, provides React state management, handles tool call execution from AI responses
- `ChatContext` (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's useChat, connects chat to file system, tracks anonymous work

### AI Integration

- Uses `@ai-sdk/anthropic` with Claude claude-haiku-4-5 model
- Falls back to `MockLanguageModel` (`src/lib/provider.ts`) when `ANTHROPIC_API_KEY` is not set - returns static component code for testing
- System prompt defined in `src/lib/prompts/generation.tsx`

### Database

SQLite via Prisma. Schema in `prisma/schema.prisma`:
- `User`: Email/password auth
- `Project`: Stores messages and file system state as JSON strings

### Auth

JWT-based session management in `src/lib/auth.ts` using jose library. Middleware in `src/middleware.ts` protects routes.

## Testing

Tests use Vitest with jsdom environment. Test files are colocated with source in `__tests__` directories.
