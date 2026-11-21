import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDDG() {
  const query = 'cinema theatre in Coimbatore official';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 8000,
    });
    console.log('DDG status:', res.status, 'html len:', res.data?.length);
    const $ = cheerio.load(res.data);
    const links = [];
    $('.result__body').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const href = $(el).find('.result__url').text().trim();
      if (title) links.push({ title, snippet, href });
    });
    console.log(`Found ${links.length} DDG results:`);
    links.slice(0, 5).forEach((l, i) => console.log(` ${i + 1}. ${l.title} (${l.href})`));
  } catch (e) {
    console.log('DDG failed:', e.message);
  }
}

testDDG();
