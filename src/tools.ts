import * as cheerio from 'cheerio';

export const search = async (input: string) => {
  try {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    if (!TAVILY_API_KEY) {
      throw new Error("Tavily API key not found!");
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input,
        search_depth: "basic",
        max_results: 4,
      }),
    });

    const data = await response.json();
    return {
        url: data.results.url,
        content: data.results.content,
    }

  } catch (error) {
    console.error("Error in search tool call: ", error);
  }
};

export const scrape = async (url: string) => {
    try {
        const response = await fetch(url);
        const text_response = await response.text();

        const $ = cheerio.load(text_response);
        
        $('script').remove()
        $('style').remove()

        if ($('body').length === 0) {
            throw new Error("No webpage body avaliable in the given URL");
        }
        return $('body').text();
    } catch (error) {
        console.error("Error in scrape tool call: ", error);
    }
}