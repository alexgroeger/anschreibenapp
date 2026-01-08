/**
 * Utility functions for website extraction and scraping
 */

/**
 * Extracts website URLs from text
 * @param text The text to search for URLs
 * @returns Array of found URLs
 */
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Extracts the most likely company website URL from text
 * Prioritizes URLs that look like company websites (not job boards, etc.)
 * @param text The text to search
 * @param companyName Optional company name to help identify the correct URL
 * @returns The most likely company website URL or null
 */
export function extractCompanyWebsite(text: string, companyName?: string | null): string | null {
  const urls = extractUrlsFromText(text);
  
  if (urls.length === 0) {
    return null;
  }
  
  // Filter out common job board and social media URLs
  const excludedDomains = [
    'linkedin.com',
    'xing.com',
    'stepstone.de',
    'indeed.com',
    'monster.com',
    'glassdoor.com',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'youtube.com',
    'github.com',
    'stackoverflow.com',
  ];
  
  // Filter URLs
  const companyUrls = urls.filter(url => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Exclude job boards and social media
      if (excludedDomains.some(domain => hostname.includes(domain))) {
        return false;
      }
      
      // If company name is provided, prefer URLs that might contain it
      if (companyName) {
        const companyLower = companyName.toLowerCase();
        const hostnameParts = hostname.split('.');
        // Check if any part of the hostname matches the company name
        if (hostnameParts.some(part => part.includes(companyLower.replace(/\s+/g, '')))) {
          return true;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  });
  
  // Return the first valid company URL, or the first URL if none match
  return companyUrls.length > 0 ? companyUrls[0] : (urls[0] || null);
}

/**
 * Fetches and extracts text content from a website
 * Focuses on extracting relevant information like company values, culture, mission, etc.
 * Only extracts information relevant for job applications.
 * @param url The website URL
 * @returns The extracted text content or null if failed
 */
export async function scrapeWebsiteContent(url: string): Promise<string | null> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // Fetch the website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      // Add timeout
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    // Remove unwanted sections (navigation, footer, header, etc.)
    let cleanedHtml = html
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // Keywords for relevant sections (German and English)
    const relevantKeywords = [
      // About/Company
      'über uns', 'about us', 'about', 'unternehmen', 'company', 'wir sind', 'we are',
      // Mission/Vision
      'mission', 'vision', 'ziel', 'goal', 'zweck', 'purpose', 'warum', 'why',
      // Values
      'werte', 'values', 'grundsätze', 'principles', 'philosophie', 'philosophy',
      // Culture
      'kultur', 'culture', 'team', 'arbeitskultur', 'work culture', 'klima', 'atmosphere',
      // Other relevant
      'geschichte', 'history', 'leitbild', 'leitbild', 'identität', 'identity'
    ];
    
    // Extract meta information
    const metaDescriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1] : '';
    
    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const ogDescription = ogDescriptionMatch ? ogDescriptionMatch[1] : '';
    
    // Extract relevant sections by heading patterns
    const headingPatterns = [
      // Match headings containing relevant keywords
      new RegExp(`<h[1-3][^>]*>.*?(?:${relevantKeywords.join('|')})[^<]*<\/h[1-3]>[\\s\\S]{0,3000}`, 'gi'),
    ];
    
    let relevantSections: string[] = [];
    
    // Extract sections by headings
    for (const pattern of headingPatterns) {
      const matches = cleanedHtml.match(pattern);
      if (matches) {
        relevantSections.push(...matches);
      }
    }
    
    // Extract sections by class/id names
    const sectionClassPatterns = [
      /<section[^>]*(?:id|class)=["'][^"']*(?:about|values|culture|mission|vision|philosophy|team|company|über|werte|kultur)[^"']*["'][^>]*>[\s\S]{0,5000}/gi,
      /<div[^>]*(?:id|class)=["'][^"']*(?:about|values|culture|mission|vision|philosophy|team|company|über|werte|kultur)[^"']*["'][^>]*>[\s\S]{0,5000}/gi,
      /<article[^>]*(?:id|class)=["'][^"']*(?:about|values|culture|mission|vision|philosophy|team|company|über|werte|kultur)[^"']*["'][^>]*>[\s\S]{0,5000}/gi,
    ];
    
    for (const pattern of sectionClassPatterns) {
      const matches = cleanedHtml.match(pattern);
      if (matches) {
        relevantSections.push(...matches);
      }
    }
    
    // Extract main content area (usually <main> or content divs)
    const mainContentMatch = cleanedHtml.match(/<main[^>]*>([\s\S]{0,8000})<\/main>/i);
    if (mainContentMatch) {
      relevantSections.push(mainContentMatch[1]);
    }
    
    // Convert HTML sections to text
    let extractedText = '';
    
    // Process each relevant section
    for (const section of relevantSections) {
      let sectionText = section
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&[#\w]+;/g, ' ') // Remove other HTML entities
        .replace(/\s+/g, ' ')
        .trim();
      
      // Filter out sections that are likely not relevant
      const excludePatterns = [
        /(?:impressum|datenschutz|privacy|agb|terms|kontakt|contact|jobs|karriere|career|news|blog|presse|press|shop|store|produkte|products|services|leistungen)/i,
      ];
      
      // Only include if it doesn't match exclusion patterns and contains relevant keywords
      const hasRelevantKeyword = relevantKeywords.some(keyword => 
        sectionText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      const isExcluded = excludePatterns.some(pattern => pattern.test(sectionText));
      
      if (hasRelevantKeyword && !isExcluded && sectionText.length > 50) {
        extractedText += sectionText + '\n\n';
      }
    }
    
    // Build final content
    let combinedContent = '';
    
    // Add meta description if relevant
    const allDescriptions = [metaDescription, ogDescription].filter(Boolean).join(' ');
    if (allDescriptions) {
      // Check if description contains relevant keywords
      const hasRelevantContent = relevantKeywords.some(keyword =>
        allDescriptions.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasRelevantContent) {
        combinedContent += `Unternehmensbeschreibung: ${allDescriptions}\n\n`;
      }
    }
    
    // Add extracted sections
    if (extractedText.trim()) {
      // Remove duplicates and clean up
      const uniqueSections = extractedText
        .split('\n\n')
        .filter((section, index, self) => {
          // Remove very short sections
          if (section.trim().length < 50) return false;
          // Remove duplicates (similar content)
          return self.findIndex(s => {
            const similarity = calculateTextSimilarity(section, s);
            return similarity > 0.8;
          }) === index;
        })
        .slice(0, 10); // Limit to 10 most relevant sections
      
      combinedContent += uniqueSections.join('\n\n');
    }
    
    // Clean up
    combinedContent = combinedContent
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Return null if we didn't extract meaningful content
    if (combinedContent.trim().length < 100) {
      return null;
    }
    
    // No character limit - return all extracted content
    // The user can edit it in the UI if needed
    return combinedContent || null;
  } catch (error: any) {
    console.error('Error scraping website:', error.message);
    return null;
  }
}

/**
 * Calculate simple text similarity (0-1)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const allWords = new Set([...words1, ...words2]);
  const intersection = words1.filter(word => words2.includes(word));
  return intersection.length / allWords.size;
}

/**
 * Extracts relevant information about a company from website content
 * Uses AI to analyze the website content and extract key information
 * @param websiteContent The scraped website content
 * @param companyName The company name
 * @returns Extracted company information
 */
export async function extractCompanyInfoFromWebsite(
  websiteContent: string,
  companyName: string
): Promise<string> {
  // This will be implemented in the API endpoint using AI
  // For now, return a summary of the content
  if (websiteContent.length > 2000) {
    return websiteContent.substring(0, 2000) + '...';
  }
  return websiteContent;
}

