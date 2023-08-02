const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

exports.getNFTs = async (req, res) => {
  const { solanaAddress } = req.query;
  const url = `https://app.step.finance/en/nft?watching=${solanaAddress}`;
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const PUPPETEER_OPTIONS = {
      headless: 'new',
    };

        const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    }); // Add '--no-sandbox' for running in Google Cloud Functions
    const page = await browser.newPage();

    await page.goto(url);

    // Aguardar até que o elemento .nft-name seja carregado
    await page.waitForFunction(() => !!document.querySelector('.nft-name'));

    // Interagir com o elemento de pesquisa para ativar as opções
    const searchInput = await page.$('.ant-select-selection-search-input');
    if (searchInput) {
      await searchInput.click();
      // Aguardar um breve tempo após interagir com o elemento de pesquisa
      await page.waitForTimeout(500);
    }

    // Procura o elemento contendo as opções "18 / page" e "99 / page"
    const paginationSelector = 'div.ant-select.ant-pagination-options-size-changer.ant-select-single.ant-select-show-arrow[aria-label="Page Size"]';
    const paginationElement = await page.$(paginationSelector);

    if (paginationElement) {
      // Clica em "99 / page" se disponível
      const option99PerPageElement = await paginationElement.$('div[title="99 / page"]');
      if (option99PerPageElement) {
        console.log('Clicando em "99 / page"...');
        await option99PerPageElement.click();
        console.log('Aguardando o carregamento completo da página após clicar em "99 / page"...');
        // Aguarda o carregamento completo da página (aumentar esse tempo, se necessário)
        await page.waitForFunction(() => !!document.querySelector('.nft-name'));
        console.log('Carregamento completo da página concluído.');
      } else {
        console.log('Opção "99 / page" não encontrada. Continuando com a página padrão "18 / page".');
      }
    }

    const nfts = [];

    const html = await page.content();
    const $ = cheerio.load(html);

    $('.ant-card.ant-card-small.css-13b0fq4.em0dvsl8').each((index, element) => {
      const name = $(element).find('.nft-name').text().trim();
      const quantityElement = $(element).find('.css-1ks9uvr.em0dvsl2 .css-1wf0tja.e1dxn7748').first();
      const quantity = quantityElement.length ? quantityElement.text().trim() : '1';

      nfts.push({ name, quantity });
    });

    await browser.close();


    res.json(nfts);
  } catch (error) {
    console.error('Erro ao obter os dados das NFTs:', error.message);
    res.status(500).json({ error: 'Erro ao obter os dados das NFTs' });
  }
};
