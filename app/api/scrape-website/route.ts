import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsiteContent } from '@/lib/website-utils';
import { summarizeWebsiteContentWithAI } from '@/lib/website-utils-server';

/**
 * POST: Scrape website content and summarize with AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Scrape website content
    const rawContent = await scrapeWebsiteContent(url);

    if (!rawContent) {
      return NextResponse.json(
        { error: 'Failed to scrape website content' },
        { status: 500 }
      );
    }

    // Summarize with AI to extract only relevant information
    console.log('Summarizing website content with AI...');
    const summarizedContent = await summarizeWebsiteContentWithAI(rawContent);

    // Use summarized content if available, otherwise fall back to raw content
    const finalContent = summarizedContent || rawContent;

    return NextResponse.json({ 
      content: finalContent,
      wasSummarized: !!summarizedContent 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error scraping website:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape website' },
      { status: 500 }
    );
  }
}
