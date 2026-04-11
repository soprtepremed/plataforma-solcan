/**
 * Helper to parse and standardize order notes into a log sequence.
 * @param {string|null} rawNotas - The raw string from the database.
 * @returns {Array} Array of note objects { fecha, texto }
 */
export const parseNotas = (rawNotas) => {
    if (!rawNotas || typeof rawNotas !== 'string') return [];
    if (!rawNotas.trim()) return [];

    try {
        const parsed = JSON.parse(rawNotas);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        // If it's pure JSON but not an array, just wrap it
        return [{ fecha: new Date().toISOString(), texto: rawNotas }];
    } catch (e) {
        // If it fails parsing, it is legacy plain text
        return [{ fecha: null, texto: rawNotas }];
    }
};
