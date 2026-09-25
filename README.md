# Glider Web

**Glider Web** is the web platform for Glider, a voice-first AI shopping assistant designed to simplify product discovery, ordering, payment, and delivery tracking through conversational interactions.

The application combines an AI assistant interface with commerce-oriented user profiles, preferences, virtual orders, delivery tracking, and accessibility settings.

## Overview

Glider rethinks e-commerce as a conversational workflow.

Instead of requiring users to repeatedly navigate search pages, filters, product detail pages, carts, and checkout forms, Glider is designed to help users express what they need in natural language and move through the shopping process with an AI assistant.

Glider Web serves as the browser-based workspace and commerce backend prototype for this experience.

The platform currently includes:

* AI assistant interface
* conversational shopping flows
* product data
* purchase history
* user profiles
* addresses
* payment methods
* voice preferences
* accessibility preferences
* virtual orders
* virtual payments
* delivery tracking

## Core Capabilities

### AI Shopping Assistant

The main interface is built around a conversational AI assistant.

Users can interact with Glider through natural-language requests such as:

```text
"배송 빠른 생수 추천해줘."

"지난번에 샀던 세제 다시 찾아줘."

"5만원 이하 무선 이어폰 비교해줘."

"이 상품 주문 진행해줘."
```

The assistant interface is designed to support the broader shopping workflow rather than only general-purpose chat.

### Conversational Commerce

Glider is structured around an agent-assisted purchasing flow.

```text
User Request
    │
    ▼
Intent Understanding
    │
    ▼
Product Discovery
    │
    ▼
Comparison / Recommendation
    │
    ▼
Option Selection
    │
    ▼
Order Creation
    │
    ▼
Payment
    │
    ▼
Delivery Tracking
```

The current implementation uses virtual commerce entities for development and product-flow validation.

### Product Discovery

The repository includes seeded product datasets used to prototype:

* product search
* recommendations
* comparison
* selection
* structured shopping responses

Product seed data is maintained under:

```text
data/products.seed.json
data/products.seed.ts
```

### Purchase History

Glider can use previous purchase information as part of the shopping experience.

Seeded purchase-history data is included for development and testing.

```text
data/purchase-history.seed.json
data/purchase-history.seed.ts
```

This architecture can support use cases such as:

```text
"지난번에 산 거 다시 주문해줘."
```

## User Profile

User-related commerce state is represented through Prisma.

The platform currently models:

### Profile

```text
UserProfile
```

including:

* display name
* email
* addresses
* payment methods
* preferences
* orders

### Addresses

Users can maintain multiple delivery addresses and select a default address.

### Payment Methods

Payment methods can be stored as masked representations for commerce-flow simulation.

### Voice Preferences

Glider includes a dedicated voice preference model for future voice-first shopping experiences.

### Accessibility Preferences

The application explicitly models accessibility settings including:

* large text
* high contrast
* simplified mode
* voice feedback

This is particularly relevant to Glider's goal of reducing complexity in conventional shopping interfaces.

## Order System

Glider Web contains a virtual order model for developing end-to-end shopping flows.

A virtual order stores information such as:

* order ID
* user
* product
* product name snapshot
* quantity
* selected options
* merchant
* order status
* estimated arrival
* total amount

Conceptually:

```text
Product
   │
   ▼
Virtual Order
   │
   ├── Virtual Payment
   │
   └── Delivery Tracking Events
```

## Payments

The current commerce prototype includes `VirtualPayment`.

The model records:

* order
* payment method
* payment status
* paid amount

This makes it possible to validate purchasing workflows without coupling the prototype directly to a production payment provider.

## Delivery Tracking

Orders can include multiple delivery events.

The platform can represent a lifecycle such as:

```text
Order Placed
    ↓
Payment Confirmed
    ↓
Preparing Shipment
    ↓
Shipped
    ↓
In Transit
    ↓
Delivered
```

Delivery-related API routes are separated from order APIs.

## AI Workspace

The web interface is structured as an AI workspace rather than a conventional product catalog.

Major UI components include:

```text
AIAssistantUI
ChatPane
Composer
ConversationRow
Sidebar
SearchModal
```

The workspace also supports organizational concepts such as:

* conversations
* folders
* templates
* search
* settings

This architecture allows Glider to evolve beyond a single shopping conversation into a persistent AI commerce workspace.

## Architecture

```text
User
 │
 ▼
Glider Web
 │
 ├── AI Assistant UI
 │
 ├── Conversation Workspace
 │
 ├── Product Context
 │
 └── User Preferences
 │
 ▼
Next.js API Layer
 │
 ├── /api/agent
 ├── /api/orders
 ├── /api/delivery
 └── /api/settings
 │
 ├───────────────┐
 ▼               ▼
OpenAI         Prisma
                 │
                 ▼
               SQLite
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     Profile   Orders   Delivery
```

## Tech Stack

| Area          | Technology           |
| ------------- | -------------------- |
| Framework     | Next.js 15           |
| Frontend      | React 19             |
| Language      | TypeScript           |
| AI            | OpenAI               |
| ORM           | Prisma               |
| Database      | SQLite               |
| Styling       | Tailwind CSS         |
| UI Components | Radix UI             |
| Animation     | Framer Motion        |
| Charts        | Recharts             |
| Forms         | React Hook Form      |
| Validation    | Zod                  |
| Analytics     | Vercel Analytics     |
| Testing       | Node / TSX E2E tests |

## Project Structure

```text
app/
├── api/
│   ├── agent/
│   ├── delivery/
│   ├── orders/
│   └── settings/
├── layout.tsx
└── page.tsx

components/
├── AIAssistantUI.tsx
├── ChatPane.tsx
├── Composer.tsx
├── ConversationRow.tsx
├── Sidebar.tsx
├── SearchModal.tsx
├── SettingsPopover.tsx
├── CreateFolderModal.tsx
├── CreateTemplateModal.tsx
└── ui/

data/
├── products.seed.json
├── products.seed.ts
├── purchase-history.seed.json
├── purchase-history.seed.ts
├── loaders.ts
└── glider-mvp.sqlite

prisma/
└── schema.prisma

lib/
hooks/
docs/
public/
styles/
tests/
```

## Database Model

The current Prisma schema includes:

```text
UserProfile
├── Address[]
├── PaymentMethod[]
├── VoicePreference
├── AccessibilityPreference
└── VirtualOrder[]
        ├── VirtualPayment
        └── DeliveryTrackingEvent[]
```

SQLite is used for the current MVP environment.

The data layer can later be migrated to a production database when required.

## API Routes

### AI Agent

```text
/api/agent
```

Handles the conversational AI layer and shopping-assistant interactions.

### Orders

```text
/api/orders
```

Handles virtual commerce order workflows.

### Delivery

```text
/api/delivery
```

Handles delivery status and tracking flows.

### Settings

```text
/api/settings
```

Handles user and experience preferences.

## Getting Started

### Prerequisites

Install:

* Node.js 20+
* npm
* a configured OpenAI API key
* Prisma-compatible local environment

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` or `.env.local` file with the required configuration.

At minimum, the application may require:

```env
OPENAI_API_KEY=your-api-key
DATABASE_URL=file:./data/glider-mvp.sqlite
```

Use the actual environment-variable names configured in the project when deploying.

Do not commit production credentials.

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

If schema changes need to be applied:

```bash
npx prisma migrate dev
```

To inspect the database interactively:

```bash
npx prisma studio
```

## Development

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Lint

```bash
npm run lint
```

## End-to-End Tests

The repository includes an E2E scenario test.

```bash
npm run test:e2e
```

## Related Repository

Glider also has a dedicated Flutter mobile client.

The mobile application handles the smartphone-oriented user experience and is maintained separately as:

```text
glider-mobile
```

Conceptually:

```text
glider-mobile
      │
      │ Mobile Experience
      ▼
Glider Platform
      ▲
      │ AI / Commerce Workspace
      │
glider-web
```

## Accessibility

Accessibility is part of the product model rather than an afterthought.

Glider currently represents preferences for:

* larger text
* high-contrast presentation
* simplified interaction
* voice feedback

This architecture is intended to make conversational commerce useful for users who may struggle with dense or navigation-heavy e-commerce interfaces.

## Product Direction

Glider Web is intended to evolve into the operational layer for an AI-native shopping agent.

Future capabilities can include:

### Live Commerce Integration

Connect the agent to real product catalogs and commerce APIs.

### Cross-Merchant Search

Search and compare products across multiple merchants.

### Personalized Shopping

Use approved user context such as:

* purchase history
* preferred brands
* price sensitivity
* delivery preferences
* saved addresses
* accessibility preferences

to improve recommendations.

### Transaction Execution

Move from virtual ordering toward real:

```text
Cart
→ Checkout
→ Payment
→ Order
→ Delivery
```

integrations.

### Voice-First Commerce

Allow the full shopping experience to be completed through spoken interaction.

### Agentic Shopping

The long-term model is an assistant capable of carrying a shopping task from intent to fulfillment while retaining explicit user control over consequential actions.

```text
Discover
→ Compare
→ Recommend
→ Configure
→ Confirm
→ Purchase
→ Track
```

## Development Status

Glider Web is currently an MVP and product-validation environment.

The repository contains working foundations for:

* AI assistant interaction
* product data
* purchase history
* user profiles
* addresses
* payment-method representation
* accessibility preferences
* virtual orders
* payments
* delivery tracking
* persistent workspace UI

## Project

**Glider Web**
Web platform for a voice-first AI shopping assistant and conversational commerce experience.
