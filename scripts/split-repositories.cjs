const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node scripts/split-repositories.cjs INPUT.svg OUTPUT_DIR');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(await readFile(input, 'utf8'));
    await page.evaluate(() => document.fonts.ready);
    const cards = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const rows = [...svg.querySelectorAll('section.repository')];
      const expected = ['Revlu-hackathon', 'gradintel', 'Portfolio', 'SolFlow'];
      const names = rows.map(row => row.querySelector('.name span').textContent.trim());
      if (names.join(',') !== expected.map(name => `itsramananshul/${name}`).join(',')) {
        throw new Error(`Unexpected featured repositories: ${names.join(', ')}`);
      }
      const width = Number(svg.getAttribute('width'));
      const height = Number(svg.getAttribute('height'));
      const origin = svg.getBoundingClientRect().top;
      // Crop at measured row boundaries so each linked image retains the original artwork.
      const boundaries = [0, ...rows.slice(1).map(row => row.parentElement.getBoundingClientRect().top - origin), height];
      return rows.map((row, index) => {
        const start = boundaries[index];
        const end = boundaries[index + 1];
        if (end <= start || end > height) throw new Error('Invalid repository crop bounds');
        const copy = svg.cloneNode(true);
        copy.setAttribute('viewBox', `0 ${start} ${width} ${end - start}`);
        copy.setAttribute('height', String(end - start));
        copy.querySelector('foreignObject').setAttribute('height', String(height));
        return { name: expected[index], svg: new XMLSerializer().serializeToString(copy) };
      });
    });
    await mkdir(output, { recursive: true });
    for (const card of cards) {
      await writeFile(join(output, `metrics.repository.${card.name}.svg`), card.svg);
      console.log(`Created clickable image for ${card.name}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
