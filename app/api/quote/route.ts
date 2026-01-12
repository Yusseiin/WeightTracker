import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// In-memory cache for the daily quote
let cachedQuote: { text: string; author: string; date: string } | null = null;

// Total number of quotes in the CSV (excluding header)
const TOTAL_QUOTES = 499715;

// Maximum quote length
const MAX_QUOTE_LENGTH = 125;

// Maximum attempts to find a valid quote
const MAX_ATTEMPTS = 100;

// Required tags (quote must have at least one of these)
const REQUIRED_TAGS = ['inspirational', 'motivation', 'motivational'];

// Simple hash function to generate a consistent number from a date string
function hashDate(dateString: string, seed: number = 0): number {
  let hash = seed;
  const input = dateString + seed.toString();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Parse a CSV line that may contain quoted fields with commas
function parseCSVLine(line: string): { quote: string; author: string; category: string } | null {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  if (result.length >= 2) {
    return {
      quote: result[0],
      author: result[1],
      category: result[2] || '',
    };
  }
  return null;
}

// Check if category contains inspirational or motivation tags
function hasRequiredTag(category: string): boolean {
  const lowerCategory = category.toLowerCase();
  return REQUIRED_TAGS.some(tag => lowerCategory.includes(tag));
}

// Read a specific line from the CSV file and return full parsed data
async function getQuoteByLineNumber(lineNumber: number): Promise<{ quote: string; author: string; category: string } | null> {
  const quotesPath = path.join(process.cwd(), 'resource', 'quotes.csv');

  return new Promise((resolve) => {
    const stream = createReadStream(quotesPath, { encoding: 'utf-8' });
    const rl = createInterface({ input: stream });

    let currentLine = 0;
    let found = false;

    rl.on('line', (line) => {
      currentLine++;

      // Skip header (line 1) and find target line
      if (currentLine === lineNumber + 1) { // +1 because of header
        found = true;
        rl.close();
        stream.destroy();

        const parsed = parseCSVLine(line);
        if (parsed) {
          resolve(parsed);
        } else {
          resolve(null);
        }
      }
    });

    rl.on('close', () => {
      if (!found) {
        resolve(null);
      }
    });

    rl.on('error', () => {
      resolve(null);
    });
  });
}

// Find a quote that meets all criteria: short length and has inspirational/motivation tag
async function findValidQuote(dateString: string): Promise<{ quote: string; author: string } | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Use attempt as seed to get different line numbers
    const lineNumber = (hashDate(dateString, attempt) % TOTAL_QUOTES) + 1;
    const quoteData = await getQuoteByLineNumber(lineNumber);

    if (quoteData &&
        quoteData.quote.length <= MAX_QUOTE_LENGTH &&
        hasRequiredTag(quoteData.category)) {
      return { quote: quoteData.quote, author: quoteData.author };
    }
  }

  // If no valid quote found after MAX_ATTEMPTS, return null
  return null;
}

// GET /api/quote - Get quote of the day from local CSV
export async function GET(request: NextRequest) {
  try {
    // Use date from query param if provided, otherwise use server date
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Validate date format (YYYY-MM-DD)
    const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().split('T')[0];

    // Return cached quote if it's from the requested date
    if (cachedQuote && cachedQuote.date === today) {
      return NextResponse.json({
        quoteText: cachedQuote.text,
        quoteAuthor: cachedQuote.author,
      });
    }

    // Find a valid quote (short + inspirational/motivation tag)
    const quote = await findValidQuote(today);

    if (quote) {
      // Cache the quote
      cachedQuote = {
        text: quote.quote,
        author: quote.author,
        date: today,
      };

      return NextResponse.json({
        quoteText: quote.quote,
        quoteAuthor: quote.author,
      });
    }

    throw new Error('Failed to find a valid quote');
  } catch (error) {
    console.error('Quote API error:', error);

    // Return a fallback quote
    const fallbackQuotes = [
      { quoteText: "Progress, not perfection.", quoteAuthor: "" },
      { quoteText: "Small steps every day lead to big results.", quoteAuthor: "" },
      { quoteText: "Your body can do it. It's your mind you need to convince.", quoteAuthor: "" },
      { quoteText: "The greatest wealth is health.", quoteAuthor: "Virgil" },
      { quoteText: "Take care of your body. It's the only place you have to live.", quoteAuthor: "Jim Rohn" },
    ];

    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const fallback = fallbackQuotes[dayOfYear % fallbackQuotes.length];

    return NextResponse.json(fallback);
  }
}
