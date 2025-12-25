/**
 * Preset AI Deck - 60 cards specially selected for a strong AI opponent
 * 
 * Strategy: "Existentialist Control"
 * - Early game: small philosophers + mana manipulation
 * - Mid game: board control with removal spells + mid-cost philosophers
 * - Late game: powerful legendary finishers
 */

export const AI_DECK_IDS: string[] = [
    // === 1-2 Cost (Early Game) - 12 cards ===
    'diogenes',      // 1 cost - 2/1, untargetable for 3 turns (legendary)
    'pyrrhon',       // 1 cost - 1/1 (skeptic)
    'mill',          // 1 cost - 2/1 (liberal)
    'anselm',        // 2 cost - 2/2 (scholastic)
    'pascal',        // 2 cost - 3/1 (mathematician)
    'weil',          // 2 cost - 2/3 (mystic)
    'diderot',       // 2 cost - 3/1 (encyclopedist)

    // Early spells
    'axiom',         // 0 cost - +1 mana
    'cogito',        // 0 cost - draw 1
    'sophistik',     // 1 cost - +1 mana, lock 1 enemy
    'meditation',    // 1 cost - heal 6
    'kontemplation', // 1 cost - discover from top 3

    // === 3 Cost - 10 cards ===
    'socrates',      // 3 cost - 2/5 (tanky)
    'mencius',       // 3 cost - 3/4
    'zhuangzi',      // 3 cost - 2/4
    'mozi',          // 3 cost - 3/3
    'epicurus',      // 3 cost - 3/4
    'demokrit',      // 3 cost - 4/3 (aggressive)
    'anaximenes',    // 3 cost - 3/4
    'montaigne',     // 3 cost - 4/2
    'aporia',        // 3 cost - 6 damage spell
    'Aufklärung',    // 3 cost - heal 10

    // === 4 Cost - 10 cards ===
    'aristotle',     // 4 cost - 3/6 (very tanky)
    'descartes',     // 4 cost - 3/5
    'sartre',        // 4 cost - 1/1 -> 8/6 (legendary transformer)
    'kierkegaard',   // 4 cost - 3/5
    'heraklit',      // 4 cost - 4/4
    'thales',        // 4 cost - 5/3
    'confucius',     // 4 cost - 3/6
    'hume',          // 4 cost - 4/4
    'leibniz',       // 4 cost - 3/5
    'wu-wei',        // 4 cost - 10 damage spell

    // === 5 Cost - 8 cards ===
    'plato',         // 5 cost - 4/5
    'laozi',         // 5 cost - 2/8 (super tanky)
    'spinoza',       // 5 cost - 5/5
    'nagarjuna',     // 5 cost - 3/7
    'arendt',        // 5 cost - 4/5
    'beauvoir',      // 5 cost - 5/4
    'wittgenstein',  // 5 cost - board clear (legendary)
    'popper',        // 5 cost - 3/7

    // === 6 Cost - 8 cards ===
    'kant',          // 6 cost - 5/5, protection effect (legendary)
    'buddha',        // 6 cost - 4/7
    'marx',          // 6 cost - 6/5, steals enemy (legendary)
    'hegel',         // 6 cost - 5/6
    'heidegger',     // 6 cost - 4/6
    'diotima',       // 6 cost - 2/3, silences males (legendary)
    'protagoras',    // 6 cost - 5/3, destroys Religion (legendary)
    'trolley_problem', // 6 cost - 4 damage to all enemies

    // === 7+ Cost (Late Game Finishers) - 10 cards ===
    'adorno',        // 7 cost - 5/8
    'habermas',      // 7 cost - 6/6
    'van_inwagen',   // 7 cost - 6/6, transform enemy (legendary)
    'rawls',         // 8 cost - 5/7
    'jonas',         // 8 cost - 7/5, protection effect (legendary)
    'freud',         // 8 cost - choice: Es/Ich/Über-Ich (legendary)
    'nietzsche',     // 9 cost - 9/7, transforms enemy (legendary)
    'zizek',         // 9 cost - 7/9, ideology debuff (legendary)
    'tabula_rasa',   // 10 cost - board clear spell

    // === 1 Werk (Passive Bonus) ===
    'zarathustra',   // 5 cost - +1 health for Existentialism

    // === Additional cards to reach 60 ===
    'augustinus',    // 5 cost - 4/4, Religion
    'bentham',       // 4 cost - 3/4, Utilitarism
];

// Validate that we have exactly 60 cards
if (AI_DECK_IDS.length !== 60) {
    console.warn(`AI Deck has ${AI_DECK_IDS.length} cards, expected 60`);
}
