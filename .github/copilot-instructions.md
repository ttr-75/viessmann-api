# Viessmann API Client - Workspace Instructions

## Project Overview
Node.js TypeScript client library for Viessmann heat pump API.

## Project Structure
- `src/` - TypeScript source files
  - `client.ts` - Main API client implementation
  - `types.ts` - TypeScript interfaces and types
  - `index.ts` - Module exports
- `dist/` - Compiled JavaScript output
- `package.json` - Project configuration and dependencies
- `tsconfig.json` - TypeScript compiler configuration

## Setup Instructions
1. Install Node.js from https://nodejs.org/
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript
4. Copy `.env.example` to `.env` and add your Viessmann API credentials

## Key Dependencies
- `axios` - HTTP client for API requests
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

## Development Commands
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development

## API Credentials
Obtain credentials from https://developer.viessmann.com/
