/**
 * ============================================================================
 * [INTEROPERABILITY]: University Banana API Service Integration
 * Architecture: Service Layer
 * Purpose: Interoperate with external university-provided web service
 * Endpoint: https://marcconrad.com/uob/banana/api.php?out=json
 * ============================================================================
 */

// University-provided endpoint for Banana Math Puzzles
const BANANA_API_ENDPOINT = 'https://marcconrad.com/uob/banana/api.php?out=json';

/**
 * Fallback puzzle pool used ONLY if university server suffers outage or network drop.
 * Guarantees zero application downtime and adheres to resilient software design.
 */
const FALLBACK_PUZZLES = [
  {
    question: 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n103.png',
    solution: 3
  },
  {
    question: 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n104.png',
    solution: 7
  },
  {
    question: 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n105.png',
    solution: 5
  }
];

/**
 * [INTEROPERABILITY] Asynchronously queries the university-provided Banana API.
 * Uses HTTP GET to retrieve puzzle image URL and solution integer.
 * Implements AbortController timeout and graceful network exception handling.
 * 
 * @param {number} timeoutMs - Request timeout in milliseconds (default: 5000ms)
 * @returns {Promise<{ question: string, solution: number, isFallback: boolean }>}
 */
async function fetchBananaPuzzle(timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[INTEROPERABILITY] Querying University Banana API: ${BANANA_API_ENDPOINT}`);

    // [INTEROPERABILITY] Outgoing HTTP request to external University Banana Web Service
    const response = await fetch(BANANA_API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BananaArcade-AcademicClient/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`University API returned HTTP status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate payload structure from university API
    if (!data || typeof data.question !== 'string' || typeof data.solution === 'undefined') {
      throw new Error('Malformed payload received from University Banana API');
    }

    console.log(`[INTEROPERABILITY] Successfully received puzzle from University API (solution: ${data.solution})`);

    return {
      question: data.question,
      solution: parseInt(data.solution, 10),
      isFallback: false
    };

  } catch (error) {
    clearTimeout(timeoutId);

    // [INTEROPERABILITY] Graceful Error Handling: Prevent server crash on external network failure
    const isTimeout = error.name === 'AbortError';
    console.warn(
      `[INTEROPERABILITY WARNING] University Banana API unreachable (${isTimeout ? 'Request timed out' : error.message}). ` +
      `Activating graceful fallback puzzle to sustain uninterrupted gameplay.`
    );

    // Pick random fallback puzzle to keep client gameplay functioning seamlessly
    const fallback = FALLBACK_PUZZLES[Math.floor(Math.random() * FALLBACK_PUZZLES.length)];

    return {
      question: fallback.question,
      solution: fallback.solution,
      isFallback: true,
      errorNotice: 'University Banana API was temporarily unreachable; loaded fallback puzzle.'
    };
  }
}

module.exports = {
  BANANA_API_ENDPOINT,
  fetchBananaPuzzle
};
