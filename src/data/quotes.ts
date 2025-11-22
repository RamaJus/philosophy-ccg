// Philosophical quotes for victory and defeat - All authentic quotes
export const victoryQuotes = [
    '"Der einzige wahre Sieg ist der über sich selbst." - Plato',
    '"Wissen ist Macht." - Francis Bacon',
    '"Der Anfang ist die Hälfte des Ganzen." - Aristoteles',
    '"Siege sind gut, aber der Friede ist besser." - Leo Tolstoi',
    '"Die Hoffnung ist der Regenbogen über dem herabstürzenden Bach des Lebens." - Friedrich Nietzsche',
];

export const defeatQuotes = [
    '"Ich weiß, dass ich nichts weiß." - Sokrates',
    '"Was mich nicht umbringt, macht mich stärker." - Friedrich Nietzsche',
    '"Der Weise lernt aus dem Irrtum des Toren." - Konfuzius',
    '"Auch aus Steinen, die einem in den Weg gelegt werden, kann man Schönes bauen." - Johann Wolfgang von Goethe',
    '"Ein Mensch, der einen Fehler gemacht und ihn nich korrigiert, begeht einen zweiten Fehler." - Konfuzius',
];

export function getRandomQuote(isVictory: boolean): string {
    const quotes = isVictory ? victoryQuotes : defeatQuotes;
    return quotes[Math.floor(Math.random() * quotes.length)];
}
