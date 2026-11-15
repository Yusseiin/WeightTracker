"use client";

import { useState, useEffect } from "react";
import { Quote, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "@/hooks/use-translation";

interface QuoteData {
  quoteText: string;
  quoteAuthor: string;
}

export function MotivationalQuote() {
  const { t } = useTranslation();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

    // Use today's cached quote if there is one, otherwise fetch it from our
    // API (which caches server-side) and cache it for the rest of the day
    const readCache = (): QuoteData | null => {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      try {
        return JSON.parse(cached);
      } catch {
        // Invalid cache, remove it
        localStorage.removeItem(cacheKey);
        return null;
      }
    };

    const fetchQuote = (): Promise<QuoteData | null> =>
      fetch(`/api/quote?date=${today}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!data?.quoteText) return null;
          localStorage.setItem(cacheKey, JSON.stringify(data));
          return data;
        });

    const cached = readCache();
    (cached ? Promise.resolve(cached) : fetchQuote())
      .then((data) => {
        if (data) setQuote(data);
      })
      .catch((error) => console.error("Failed to fetch quote:", error))
      .finally(() => setLoading(false));
  }, []);

  // Collapsed state - just show toggle button
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center px-4 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground opacity-50 hover:opacity-100"
          onClick={() => setIsCollapsed(false)}
          aria-label={t('dashboard.quote.show')}
        >
          <Quote className="h-3 w-3 mr-1" />
          {t('dashboard.quote.show')}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-4 py-2">
        <Quote className="h-4 w-4 shrink-0 opacity-50" />
        <span className="animate-pulse">{t('dashboard.quote.loading')}</span>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 text-muted-foreground text-sm italic px-4 py-2">
      <Quote className="h-4 w-4 shrink-0 mt-0.5 opacity-50" />
      <p className="flex-1">
        &ldquo;{quote.quoteText.trim()}&rdquo;
        {quote.quoteAuthor && (
          <span className="not-italic font-medium"> — {quote.quoteAuthor}</span>
        )}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
        onClick={() => setIsCollapsed(true)}
        aria-label={t('dashboard.quote.hide')}
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
    </div>
  );
}
