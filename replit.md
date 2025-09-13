# Garden Shop Claim System

## Overview

This is a full-stack web application built for handling Roblox garden item claims. The system allows customers to verify their purchases using invoice IDs and receive their virtual garden items through an automated bot delivery system. The application features a modern React frontend with a Node.js/Express backend and uses PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with **React 18** and **TypeScript**, utilizing modern hooks and functional components. The UI is powered by **shadcn/ui** components built on **Radix UI** primitives, providing accessible and customizable interface elements. **Tailwind CSS** handles styling with a dark theme design system featuring green accent colors. The application uses **Wouter** for lightweight client-side routing and **TanStack Query** for server state management and API interactions.

The frontend follows a component-based architecture with:
- Custom form components using **React Hook Form** with **Zod** validation
- Reusable UI components from the shadcn/ui library
- Step-based claim verification flow with progress indicators
- Responsive design optimized for both desktop and mobile devices

### Backend Architecture
The server is built with **Express.js** and **TypeScript**, providing a REST API for claim verification and management. The application uses **Drizzle ORM** for database interactions with PostgreSQL, offering type-safe database operations and migrations.

Key backend features include:
- RESTful API endpoints for claim verification
- In-memory storage implementation for development/testing
- Database schema with users, claims, and claim items tables
- Input validation using Zod schemas shared between frontend and backend
- Error handling middleware for consistent API responses

### Data Storage
The system uses **PostgreSQL** as the primary database with **Neon Database** as the serverless provider. The database schema includes:
- **Users table**: For potential future authentication
- **Claims table**: Stores invoice information and verification status
- **Claim Items table**: Details of purchased items with delivery tracking

Database migrations are managed through **Drizzle Kit**, ensuring schema consistency across environments.

### Authentication & Session Management
Currently implements a basic verification system using invoice IDs, email addresses, and Roblox usernames. The system validates claims by matching all three pieces of information before allowing access to purchased items.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI & Styling
- **shadcn/ui**: Pre-built React components based on Radix UI
- **Radix UI**: Headless UI component library for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

### State Management & Forms
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### Development & Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution engine for development

### Third-Party Integrations
- **Replit**: Development environment and hosting platform
- **Discord**: Customer support integration (links to Discord server)
- **Roblox**: Target platform for item delivery (bot integration planned)

The application is designed to be easily deployable on Replit with automatic environment setup and includes development-specific tooling for enhanced debugging and error reporting.