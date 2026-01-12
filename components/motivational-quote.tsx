"use client";

import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

interface QuoteData {
  quoteText: string;
  quoteAuthor: string;
}

export function MotivationalQuote() {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use local date to ensure consistency with user's day
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cacheKey = `quote_${today}`;

    // Clear ALL old cached quotes first (any key that doesn't match today)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('quote_') && key !== cacheKey) {
        localStorage.removeItem(key);
      }
    });

    // Check localStorage for cached quote
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setQuote(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        // Invalid cache, remove it
        localStorage.removeItem(cacheKey);
      }
    }

    // Fetch quote from our API (which caches server-side)
    const fetchQuote = async () => {
      try {
        // Add cache-busting to ensure fresh quote
        const response = await fetch(`/api/quote?date=${today}`);
        if (response.ok) {
          const data = await response.json();
          if (data.quoteText) {
            setQuote(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error("Failed to fetch quote:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-4 py-2">
        <Quote className="h-4 w-4 shrink-0 opacity-50" />
        <span className="animate-pulse">Loading inspiration...</span>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 text-muted-foreground text-sm italic px-4 py-2">
      <Quote className="h-4 w-4 shrink-0 mt-0.5 opacity-50" />
      <p>
        &ldquo;{quote.quoteText.trim()}&rdquo;
        {quote.quoteAuthor && (
          <span className="not-italic font-medium"> — {quote.quoteAuthor}</span>
        )}
      </p>
    </div>
  );
}
