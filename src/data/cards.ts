import { Card } from '../types';

export const cardDatabase: Card[] = [
    // Western Philosophers
    {
        id: 'socrates',
        name: 'Socrates',
        type: 'minion',
        cost: 3,
        attack: 2,
        health: 5,
        description: 'Die Bremse Athens. "I weiß, dass ich nichts weiß."',
        rarity: 'rare',
        faction: 'western',
        school: ['Skeptizismus', 'Ethik'],
        strongAgainst: ['sophism', 'Materialismus'],
        weakAgainst: ['politics']
    },
    {
        id: 'plato',
        name: 'Plato',
        type: 'minion',
        cost: 5,
        attack: 4,
        health: 5,
        description: 'Meister der Formen. Idealismus in Person.',
        rarity: 'epic',
        faction: 'western',
        school: ['Idealismus', 'Rationalismus'],
        strongAgainst: ['Materialismus', 'sophism', 'Empirismus'],
        weakAgainst: ['Existentialismus']
    },
    {
        id: 'aristotle',
        name: 'Aristotle',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 6,
        description: 'Der Philosoph. Logik und Vernunft definiert.',
        rarity: 'epic',
        faction: 'western',
        school: ['Empirismus', 'Logik', 'Ethik'],
        strongAgainst: ['Idealismus'],
        weakAgainst: ['Religion']
    },
    {
        id: 'kant',
        name: 'Immanuel Kant',
        type: 'minion',
        cost: 6,
        attack: 5,
        health: 5,
        description: 'Kategorischer Imperativ. Handle nur nach allgemeingültigem Gesetz.',
        rarity: 'legendary',
        faction: 'western',
        school: ['Idealismus', 'deontology', 'enlightenment'],
        strongAgainst: ['Empirismus', 'Rationalismus'],
        weakAgainst: ['utilitarianism', 'Materialismus']
    },
    {
        id: 'nietzsche',
        name: 'Friedrich Nietzsche',
        type: 'minion',
        cost: 7,
        attack: 7,
        health: 4,
        description: 'Gott ist tot. Der Übermensch erhebt sich.',
        rarity: 'legendary',
        faction: 'western',
        school: ['Existentialismus', 'Nihilismus'],
        strongAgainst: ['Religion', 'Idealismus', 'Ethik'],
        weakAgainst: []
    },
    {
        id: 'descartes',
        name: 'René Descartes',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 5,
        description: 'Cogito ergo sum. Ich denke, also bin ich.',
        rarity: 'rare',
        faction: 'western',
        school: ['Rationalismus'],
        strongAgainst: ['Skeptizismus'],
        weakAgainst: ['Empirismus']
    },

    // Eastern Philosophers
    {
        id: 'confucius',
        name: 'Confucius',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 6,
        description: 'Meister Kong. Tugend und soziale Harmonie.',
        rarity: 'epic',
        faction: 'eastern',
        school: ['Ethik', 'social'],
        strongAgainst: ['anarchy', 'individualism'],
        weakAgainst: ['legalism', 'daoism']
    },
    {
        id: 'laozi',
        name: 'Laozi',
        type: 'minion',
        cost: 5,
        attack: 2,
        health: 8,
        description: 'Das Tao, das gesagt werden kann, ist nicht das ewige Tao.',
        rarity: 'legendary',
        faction: 'eastern',
        school: ['daoism'],
        strongAgainst: ['legalism', 'confucianism'],
        weakAgainst: []
    },
    {
        id: 'sun-tzu',
        name: 'Sun Tzu',
        type: 'minion',
        cost: 5,
        attack: 6,
        health: 4,
        description: 'Die Kunst des Krieges. Jede Kriegsführung basiert auf Täuschung.',
        rarity: 'epic',
        faction: 'eastern',
        school: ['strategy'],
        strongAgainst: ['Idealismus'],
        weakAgainst: []
    },
    {
        id: 'buddha',
        name: 'Siddhartha Gautama',
        type: 'minion',
        cost: 6,
        attack: 4,
        health: 7,
        description: 'Der Erleuchtete. Der mittlere Weg zum Nirvana.',
        rarity: 'legendary',
        faction: 'eastern',
        school: ['Religion', 'Metaphysik'],
        strongAgainst: ['Materialismus', 'desire', 'hedonism'],
        weakAgainst: []
    },
    {
        id: 'zhuangzi',
        name: 'Zhuangzi',
        type: 'minion',
        cost: 3,
        attack: 2,
        health: 4,
        description: 'Bin ich ein Mensch, der träumt ein Schmetterling zu sein?',
        rarity: 'rare',
        faction: 'eastern',
        school: ['daoism', 'Skeptizismus'],
        strongAgainst: ['Logik', 'confucianism'],
        weakAgainst: []
    },
    {
        id: 'mencius',
        name: 'Mencius',
        type: 'minion',
        cost: 3,
        attack: 3,
        health: 4,
        description: 'Die menschliche Natur ist inhärent gut.',
        rarity: 'rare',
        faction: 'eastern',
        school: ['confucianism', 'Idealismus'],
        strongAgainst: ['legalism'],
        weakAgainst: ['realism']
    },

    // Spell Cards
    {
        id: 'dialectic',
        name: 'Dialectic',
        type: 'spell',
        cost: 2,
        description: 'Ziehe 2 Karten. Die Synthese von These und Antithese.',
        rarity: 'common',
        faction: 'universal',
    },
    {
        id: 'aporia',
        name: 'Aporia',
        type: 'spell',
        cost: 3,
        description: 'Verursache 3 Schaden. Zustand der Ratlosigkeit.',
        rarity: 'common',
        faction: 'western',
    },
    {
        id: 'meditation',
        name: 'Meditation',
        type: 'spell',
        cost: 1,
        description: 'Stelle 3 Glaubwürdigkeit wieder her. Innerer Frieden.',
        rarity: 'common',
        faction: 'eastern',
    },
    {
        id: 'wu-wei',
        name: 'Wu Wei',
        type: 'spell',
        cost: 4,
        description: 'Verursache 5 Schaden. Handeln durch Nicht-Handeln.',
        rarity: 'rare',
        faction: 'eastern',
    },
    {
        id: 'cogito',
        name: 'Cogito',
        type: 'spell',
        cost: 2,
        description: 'Ziehe 1 Karte. Ich denke, also ziehe ich.',
        rarity: 'common',
        faction: 'western',
    },
    {
        id: 'enlightenment',
        name: 'Enlightenment',
        type: 'spell',
        cost: 3,
        description: 'Stelle 5 Glaubwürdigkeit wieder her. Der Pfad zum Verständnis.',
        rarity: 'rare',
        faction: 'universal',
    },
    {
        id: 'sophistry',
        name: 'Sophistry',
        type: 'spell',
        cost: 3,
        description: 'Stiehl 2 Dialektik (Mana) vom Gegner.',
        rarity: 'rare',
        faction: 'western',
    },
    {
        id: 'dogmatism',
        name: 'Dogmatism',
        type: 'spell',
        cost: 2,
        description: 'Sperre 2 Dialektik (Mana) des Gegners im nächsten Zug.',
        rarity: 'common',
        faction: 'western',
    },

    // Additional Western Philosophers
    {
        id: 'wittgenstein',
        name: 'Ludwig Wittgenstein',
        type: 'minion',
        cost: 5,
        attack: 4,
        health: 4,
        description: 'SPEZIAL: Leert das GESAMTE Spielfeld. "Wovon man nicht sprechen kann..."',
        rarity: 'epic',
        faction: 'western',
        school: ['Analytische Philosophie', 'Logik'],
        strongAgainst: ['Metaphysik', 'Idealismus'],
        weakAgainst: []
    },
    {
        id: 'arendt',
        name: 'Hannah Arendt',
        type: 'minion',
        cost: 5,
        attack: 4,
        health: 5,
        description: 'Die Banalität des Bösen. Größte Kritikerin des Totalitarismus.',
        rarity: 'epic',
        faction: 'western',
        school: ['Politische Philosophie', 'Existentialismus'],
        strongAgainst: ['totalitarianism', 'ideology'],
        weakAgainst: []
    },
    {
        id: 'hegel',
        name: 'Georg Hegel',
        type: 'minion',
        cost: 6,
        attack: 5,
        health: 6,
        description: 'Der Meister der Dialektik. These, Antithese, Synthese.',
        rarity: 'legendary',
        faction: 'western',
        school: ['Idealismus', 'dialectics'],
        strongAgainst: ['Empirismus'],
        weakAgainst: ['Materialismus', 'Existentialismus']
    },
    {
        id: 'locke',
        name: 'John Locke',
        type: 'minion',
        cost: 4,
        attack: 4,
        health: 4,
        description: 'Der Geist ist eine leere Tafel. Empirismus definiert.',
        rarity: 'rare',
        faction: 'western',
        school: ['Empirismus', 'Liberalismus'],
        strongAgainst: ['Rationalismus', 'monarchy'],
        weakAgainst: ['Idealismus']
    },
    {
        id: 'rousseau',
        name: 'Jean-Jacques Rousseau',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 5,
        description: 'Der Mensch wird frei geboren, liegt aber überall in Ketten.',
        rarity: 'rare',
        faction: 'western',
        school: ['Romantik', 'Politische Philosophie'],
        strongAgainst: ['enlightenment', 'Rationalismus'],
        weakAgainst: []
    },
    {
        id: 'sartre',
        name: 'Jean-Paul Sartre',
        type: 'minion',
        cost: 5,
        attack: 5,
        health: 3,
        description: 'Die Existenz geht der Essenz voraus. Zur Freiheit verurteilt.',
        rarity: 'epic',
        faction: 'western',
        school: ['Existentialismus', 'Phänomenologie'],
        strongAgainst: ['essentialism', 'Religion'],
        weakAgainst: ['structuralism']
    },
    {
        id: 'heidegger',
        name: 'Martin Heidegger',
        type: 'minion',
        cost: 6,
        attack: 4,
        health: 6,
        description: 'Sein und Zeit. Das Dasein in der Welt.',
        rarity: 'legendary',
        faction: 'western',
        school: ['Phänomenologie', 'Existentialismus'],
        strongAgainst: ['technology', 'Metaphysik'],
        weakAgainst: []
    },
    {
        id: 'schopenhauer',
        name: 'Arthur Schopenhauer',
        type: 'minion',
        cost: 5,
        attack: 3,
        health: 6,
        description: 'Die Welt als Wille und Vorstellung. Leben ist Leiden.',
        rarity: 'epic',
        faction: 'western',
        school: ['Pessimismus', 'Idealismus'],
        strongAgainst: ['optimism', 'hegelianism'],
        weakAgainst: []
    },

    // Additional Eastern Philosophers
    {
        id: 'nagarjuna',
        name: 'Nagarjuna',
        type: 'minion',
        cost: 5,
        attack: 3,
        health: 7,
        description: 'Meister der Leere. Alle Dinge fehlt inhärente Existenz.',
        rarity: 'epic',
        faction: 'eastern',
        school: ['madhyamaka', 'buddhism'],
        strongAgainst: ['essentialism', 'Logik'],
        weakAgainst: []
    },
    {
        id: 'rumi',
        name: 'Rumi',
        type: 'minion',
        cost: 4,
        attack: 2,
        health: 6,
        description: 'Die Wunde ist, wo das Licht eintritt. Sufi-Mystiker.',
        rarity: 'rare',
        faction: 'eastern',
        school: ['mysticism', 'sufism'],
        strongAgainst: ['dogmatism', 'Rationalismus'],
        weakAgainst: []
    },
    {
        id: 'al-ghazali',
        name: 'Al-Ghazali',
        type: 'minion',
        cost: 5,
        attack: 4,
        health: 5,
        description: 'Die Wiederbelebung der religiösen Wissenschaften. Islamische Philosophie.',
        rarity: 'epic',
        faction: 'eastern',
        school: ['theology', 'mysticism'],
        strongAgainst: ['Rationalismus', 'philosophy'],
        weakAgainst: ['Empirismus']
    },
    {
        id: 'mozi',
        name: 'Mozi',
        type: 'minion',
        cost: 3,
        attack: 3,
        health: 3,
        description: 'Universelle Liebe und unparteiisches Kümmern.',
        rarity: 'common',
        faction: 'eastern',
        school: ['mohism', 'utilitarianism'],
        strongAgainst: ['confucianism', 'fatalism'],
        weakAgainst: []
    },

    // NEW PHILOSOPHERS
    {
        id: 'aquinas',
        name: 'Thomas Aquinas',
        type: 'minion',
        cost: 4, // Lower cost due to vulnerability
        attack: 3,
        health: 6,
        description: 'Glaube und Vernunft in Harmonie. Die fünf Wege.',
        rarity: 'rare',
        faction: 'western',
        school: ['scholasticism', 'Religion'],
        strongAgainst: ['averroism'],
        weakAgainst: ['Empirismus', 'Existentialismus', 'Nihilismus']
    },
    {
        id: 'hume',
        name: 'David Hume',
        type: 'minion',
        cost: 4,
        attack: 4,
        health: 4,
        description: 'Die Vernunft ist nur die Sklavin der Leidenschaften.',
        rarity: 'rare',
        faction: 'western',
        school: ['Empirismus', 'Skeptizismus'],
        strongAgainst: ['Rationalismus', 'Religion', 'Metaphysik'],
        weakAgainst: []
    },
    {
        id: 'spinoza',
        name: 'Baruch Spinoza',
        type: 'minion',
        cost: 5,
        attack: 5,
        health: 5,
        description: 'Gott oder die Natur. Alles geschieht aus Notwendigkeit.',
        rarity: 'epic',
        faction: 'western',
        school: ['Rationalismus', 'pantheism'],
        strongAgainst: ['Religion', 'dualism'],
        weakAgainst: ['Empirismus']
    },
    {
        id: 'marx',
        name: 'Karl Marx',
        type: 'minion',
        cost: 6,
        attack: 6,
        health: 5,
        description: 'Proletarier aller Länder, vereinigt euch!',
        rarity: 'legendary',
        faction: 'western',
        school: ['Materialismus', 'Sozialismus'],
        strongAgainst: ['capitalism', 'Idealismus', 'Religion'],
        weakAgainst: []
    },
    {
        id: 'kierkegaard',
        name: 'Søren Kierkegaard',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 5,
        description: 'Der Sprung in den Glauben. Vater des Existentialismus.',
        rarity: 'rare',
        faction: 'western',
        school: ['Existentialismus', 'Religion'],
        strongAgainst: ['hegelianism', 'institutional_religion'],
        weakAgainst: ['Rationalismus']
    },
    {
        id: 'epicurus',
        name: 'Epicurus',
        type: 'minion',
        cost: 3,
        attack: 3,
        health: 4,
        description: 'Lust ist das höchste Gut, aber durch Mäßigung.',
        rarity: 'common',
        faction: 'western',
        school: ['Epikureismus', 'Materialismus'],
        strongAgainst: ['Religion', 'platonism'],
        weakAgainst: ['Stoizismus']
    },
    {
        id: 'seneca',
        name: 'Seneca',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 6,
        description: 'Wir leiden öfter in der Vorstellung als in der Wirklichkeit.',
        rarity: 'rare',
        faction: 'western',
        school: ['Stoizismus'],
        strongAgainst: ['hedonism', 'emotion'],
        weakAgainst: []
    },
    {
        id: 'hypatia',
        name: 'Hypatia',
        type: 'minion',
        cost: 5,
        attack: 4,
        health: 5,
        description: 'Bewahre dein Recht zu denken, denn selbst falsch zu denken ist besser als gar nicht zu denken.',
        rarity: 'epic',
        faction: 'western',
        school: ['neoplatonism', 'mathematics'],
        strongAgainst: ['dogmatism'],
        weakAgainst: ['Religion']
    },
    {
        id: 'beauvoir',
        name: 'Simone de Beauvoir',
        type: 'minion',
        cost: 5,
        attack: 5,
        health: 4,
        description: 'Man kommt nicht als Frau zur Welt, man wird es.',
        rarity: 'epic',
        faction: 'western',
        school: ['Existentialismus', 'feminism'],
        strongAgainst: ['patriarchy', 'essentialism'],
        weakAgainst: []
    },
    {
        id: 'foucault',
        name: 'Michel Foucault',
        type: 'minion',
        cost: 5,
        attack: 2,
        health: 7,
        description: 'Wissen ist Macht. Überwachen und Strafen.',
        rarity: 'legendary',
        faction: 'western',
        school: ['post-structuralism'],
        strongAgainst: ['institutions', 'humanism'],
        weakAgainst: []
    },

    // Permanent Works
    {
        id: 'tractatus',
        name: 'Tractatus Logico-Philosophicus',
        type: 'work',
        cost: 4,
        description: 'Die Welt ist alles, was der Fall ist. +2 Schaden für Analytische Philosophie/Logik.',
        rarity: 'legendary',
        faction: 'western',
        workBonus: { school: 'Logik', damage: 2 }
    },
    {
        id: 'zarathustra',
        name: 'Also sprach Zarathustra',
        type: 'work',
        cost: 5,
        description: 'Ich lehre euch den Übermenschen. +2 Schaden für Existentialismus/Nihilismus.',
        rarity: 'legendary',
        faction: 'western',
        workBonus: { school: 'Existentialismus', damage: 2 }
    },
    {
        id: 'kritik',
        name: 'Kritik der reinen Vernunft',
        type: 'work',
        cost: 5,
        description: 'Gedanken ohne Inhalt sind leer. +2 Schaden für Idealismus/Rationalismus.',
        rarity: 'legendary',
        faction: 'western',
        workBonus: { school: 'Idealismus', damage: 2 }
    },
    {
        id: 'wille',
        name: 'Die Welt als Wille und Vorstellung',
        type: 'work',
        cost: 4,
        description: 'Die Welt ist meine Vorstellung. +2 Schaden für Pessimismus.',
        rarity: 'legendary',
        faction: 'western',
        workBonus: { school: 'Pessimismus', damage: 2 }
    },
    {
        id: 'politeia',
        name: 'Politeia',
        type: 'work',
        cost: 5,
        description: 'Der Staat und die Gerechtigkeit. +2 Schaden für Politische Philosophie.',
        rarity: 'legendary',
        faction: 'western',
        workBonus: { school: 'Politische Philosophie', damage: 2 }
    },

    // New Spells
    {
        id: 'hermeneutics',
        name: 'Hermeneutics',
        type: 'spell',
        cost: 3,
        description: 'Suche eine Karte aus deinem Deck und nimm sie auf die Hand.',
        rarity: 'epic',
        faction: 'western',
    },
];



// Helper function to get a random subset of cards for deck building
// Each card appears only once in the deck
export function generateDeck(_size: number = 20): Card[] {
    // Shuffle the entire card database
    // We ignore size now to ensure every card appears exactly once
    const shuffled = shuffleDeck([...cardDatabase]);

    // Create deck with unique instance IDs for each card
    const deck = shuffled.map((card, i) => ({
        ...card,
        id: `${card.id}-instance-${Date.now()}-${i}`,
    }));

    return deck;
}


export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
