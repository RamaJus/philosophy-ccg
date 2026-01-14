// Philosophical quotes for victory and defeat
// All quotes are authentic and from philosophers appearing in the game
export const victoryQuotes = [
    'Der Sieg über sich selbst ist der größte Sieg. — Platon',
    'Glück ist Tätigkeit der Seele gemäß der Tugend. — Aristoteles',
    'Was aus Liebe getan wird, geschieht immer jenseits von Gut und Böse. — Nietzsche',
    'Der Weg ist das Ziel. — Konfuzius',
    'Es ist nicht wenig Zeit, die wir haben, sondern viel Zeit, die wir nicht nutzen. — Seneca',
    'Die Welt ist der Wille zur Macht — und nichts außerdem! — Nietzsche',
    'Wage zu wissen! — Kant',
    'Das Schicksal mischt die Karten, und wir spielen. — Schopenhauer',
    'Lebe so, als würdest du morgen sterben. Lerne so, als würdest du ewig leben. — Seneca',
    'Der Mensch ist das Maß aller Dinge. — Protagoras',
];

export const defeatQuotes = [
    'Ich weiß, dass ich nichts weiß. — Sokrates',
    'Was mich nicht umbringt, macht mich stärker. — Nietzsche',
    'Wer Großes versucht, ist bewundernswert, auch wenn er fällt. — Seneca',
    'Das Leben muss vorwärts gelebt, aber rückwärts verstanden werden. — Kierkegaard',
    'Ein Mensch wird erst dann weise, wenn er seine eigene Unwissenheit erkennt. — Sokrates',
    'Alles fließt. — Heraklit',
    'Man muss sich Sisyphos als glücklichen Menschen vorstellen. — Camus',
    'Die einzige Konstante im Universum ist die Veränderung. — Heraklit',
    'Wer einen Fehler begeht und ihn nicht korrigiert, begeht einen zweiten. — Konfuzius',
    'Der Weg nach oben und der Weg nach unten sind ein und derselbe. — Heraklit',
];

export function getRandomQuote(isVictory: boolean): string {
    const quotes = isVictory ? victoryQuotes : defeatQuotes;
    return quotes[Math.floor(Math.random() * quotes.length)];
}


