# Philosophy CCG

A digital collectible card game featuring Western and Eastern philosophers in epic debates.

## Features
- 12+ Philosopher cards (Western & Eastern)
- Spell cards with unique effects
- Turn-based gameplay with mana system
- Combat mechanics
- AI opponent
- Beautiful UI with animations

## Tech Stack
- React + TypeScript
- Vite
- TailwindCSS
- Lucide React Icons

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## How to Play

1. **Turn Structure**: Each turn you gain +1 Dialectic (mana) up to 10
2. **Play Cards**: Click cards in your hand to play them (if you have enough mana)
3. **Summon Philosophers**: Minion cards go to the battlefield
4. **Attack**: Click your minions to select them, then click opponent minions or the "Attack Opponent" button
5. **Win Condition**: Reduce opponent's Credibility (health) to 0

## Card Types

- **Philosophers (Minions)**: Have Attack and Health, can attack each turn
- **Arguments (Spells)**: One-time effects like damage, healing, or card draw

Enjoy the philosophical debate!
