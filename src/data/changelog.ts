/**
 * Changelog data for Philosophy CCG / Dialectica
 * 
 * Structure:
 * - version: Semantic version string
 * - date: ISO date string (YYYY-MM-DD)
 * - categories: Grouped changes
 *   - new: New features
 *   - improvements: Enhancements to existing features
 *   - fixes: Bug fixes
 */

export interface ChangelogEntry {
    version: string;
    date: string;
    categories: {
        new?: string[];
        improvements?: string[];
        fixes?: string[];
    };
}

export const changelog: ChangelogEntry[] = [
    {
        version: '1.1.0',
        date: '2026-01-18',
        categories: {
            new: [
                'Mulligan-System: Du kannst nun deine Starthand einmal neu ziehen.',
            ],
            improvements: [
                'Anpassung der Kartenverteilung beim Spielstart.',
                'Überarbeitung der "Eros"-Kartenbeschreibung für bessere Konsistenz.',
            ],
            fixes: [
                'KI-Bug im Mulligan-Prozess behoben.',
                'Bereinigung ungenutzter Variablen in der Kampflogik.',
            ],
        },
    },
];

// Get the latest version for badge comparison
export const getLatestVersion = (): string => {
    return changelog.length > 0 ? changelog[0].version : '0.0.0';
};
