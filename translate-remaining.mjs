import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/data/cards.ts';
let content = readFileSync(filePath, 'utf8');

// Comprehensive Translation map
const translations = {
    "'politics'": "'Politik'",
    "'sophism'": "'Sophismus'",
    "'materialism'": "'Materialismus'",
    "'individualism'": "'Individualismus'",
    "'legalism'": "'Legalismus'",
    "'daoism'": "'Daoismus'",
    "'confucianism'": "'Konfuzianismus'",
    "'strategy'": "'Strategie'",
    "'desire'": "'Begierde'",
    "'hedonism'": "'Hedonismus'",
    "'realism'": "'Realismus'",
    "'deontology'": "'Deontologie'",
    "'enlightenment'": "'Aufklärung'",
    "'utilitarianism'": "'Utilitarismus'",
    "'monarchy'": "'Monarchie'",
    "'essentialism'": "'Essentialismus'",
    "'structuralism'": "'Strukturalismus'",
    "'technology'": "'Technologie'",
    "'optimism'": "'Optimismus'",
    "'hegelianism'": "'Hegelianismus'",
    "'madhyamaka'": "'Madhyamaka'",
    "'buddhism'": "'Buddhismus'",
    "'mysticism'": "'Mystizismus'",
    "'sufism'": "'Sufismus'",
    "'theology'": "'Theologie'",
    "'philosophy'": "'Philosophie'",
    "'mohism'": "'Mohismus'",
    "'fatalism'": "'Fatalismus'",
    "'scholasticism'": "'Scholastik'",
    "'averroism'": "'Averroismus'",
    "'dualism'": "'Dualismus'",
    "'capitalism'": "'Kapitalismus'",
    "'institutional_religion'": "'Institutionelle Religion'",
    "'epicureanism'": "'Epikureismus'",
    "'platonism'": "'Platonismus'",
    "'emotion'": "'Emotion'",
    "'neoplatonism'": "'Neoplatonismus'",
    "'mathematics'": "'Mathematik'",
    "'feminism'": "'Feminismus'",
    "'patriarchy'": "'Patriarchat'",
    "'post-structuralism'": "'Poststrukturalismus'",
    "'institutions'": "'Institutionen'",
    "'humanism'": "'Humanismus'",
    "'dialectics'": "'Dialektik'",
    "'liberalism'": "'Liberalismus'",
    "'social'": "'Sozialphilosophie'",
    "'anarchy'": "'Anarchie'",
    "'pantheism'": "'Pantheismus'",
    "'totalitarianism'": "'Totalitarismus'",
    "'ideology'": "'Ideologie'",
    "'dogmatism'": "'Dogmatismus'",
    "'western'": "'Westlich'",
    "'eastern'": "'Östlich'",
    "'universal'": "'Universell'",
    "'common'": "'Gewöhnlich'",
    "'rare'": "'Selten'",
    "'epic'": "'Episch'",
    "'legendary'": "'Legendär'",
    "'minion'": "'Philosoph'",
    "'spell'": "'Zauber'",
    "'work'": "'Werk'"
};

// Apply all translations
for (const [from, to] of Object.entries(translations)) {
    // Replace single quoted versions
    content = content.split(from).join(to);
    // Replace double quoted versions (just in case)
    content = content.split(from.replace(/'/g, '"')).join(to.replace(/'/g, '"'));
}

writeFileSync(filePath, content, 'utf8');
console.log('Comprehensive translation completed!');
