export interface Avatar {
    id: string;
    name: string;
    description: string;
    image: string;
    gender: 'male' | 'female';
}

export const AVATARS: Avatar[] = [
    // Male
    {
        id: 'novice',
        name: 'Der Novize',
        description: 'Ein junger, lernbegieriger Student.',
        image: '/images/avatars/novice.png',
        gender: 'male'
    },
    {
        id: 'cynic',
        name: 'Der Kyniker',
        description: 'Ein skeptischer Wanderphilosoph.',
        image: '/images/avatars/cynic.png',
        gender: 'male'
    },
    {
        id: 'rhetorician',
        name: 'Der Rhetoriker',
        description: 'Ein leidenschaftlicher Debattierer.',
        image: '/images/avatars/rhetorician.png',
        gender: 'male'
    },
    {
        id: 'melancholic',
        name: 'Der Melancholiker',
        description: 'Ein tiefer Denker in einsamen Stunden.',
        image: '/images/avatars/melancholic.png',
        gender: 'male'
    },
    // Female
    {
        id: 'adept',
        name: 'Die Adeptin',
        description: 'Eine fokussierte Gelehrte.',
        image: '/images/avatars/adept.png',
        gender: 'female'
    },
    {
        id: 'muse',
        name: 'Die Muse',
        description: 'Eine inspirierende Gestalt der Romantik.',
        image: '/images/avatars/muse.png',
        gender: 'female'
    },
    {
        id: 'salonniere',
        name: 'Die Salonnière',
        description: 'Die Gastgeberin des geistigen Austauschs.',
        image: '/images/avatars/salonniere.png',
        gender: 'female'
    },
    {
        id: 'visionary',
        name: 'Die Seherin',
        description: 'Ein mysteriöser Blick in die Zukunft.',
        image: '/images/avatars/visionary.png',
        gender: 'female'
    }
];

export const getAvatarById = (id: string): Avatar | undefined => AVATARS.find(a => a.id === id);
export const DEFAULT_AVATAR_ID = 'novice';
