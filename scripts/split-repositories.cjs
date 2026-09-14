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
      // Give each image its own row instead of cropping a font-dependent combined layout.
      return rows.map((row, index) => {
        const copy = svg.cloneNode(true);
        [...copy.querySelectorAll('section.repository')].forEach((other, otherIndex) => {
          if (otherIndex !== index) other.parentElement.remove();
        });
        if (index > 0) copy.querySelector('h2')?.remove();
        copy.removeAttribute('viewBox');
        copy.setAttribute('height', '1000');
        copy.querySelector('foreignObject').setAttribute('height', '1000');
        document.body.replaceChildren(copy);
        const bottom = copy.querySelector('section.repository').getBoundingClientRect().bottom;
        const height = Math.ceil(bottom - copy.getBoundingClientRect().top) + 16;
        copy.setAttribute('height', String(height));
        copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
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
