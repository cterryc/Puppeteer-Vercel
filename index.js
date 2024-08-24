const app = require("express")();

const chrome = require("@sparticuz/chromium");
// const puppeteerCore = require("puppeteer-core");
// const puppeteer = require("puppeteer")
const production = process.env.NODE_ENV === "production";

let puppeteer;

if (production) {
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api/:character", async (req, res) => {
  const { character } = req.params;
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`;
  try {
    const browser = await puppeteer.launch(
      production
        ? {
            args: chrome.args,
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath(),
            headless: "new",
            ignoreHTTPSErrors: true,
          }
        : {}
    );

    const page = await browser.newPage();
    await page.goto(urlCharacter);
    const elementos = await page.evaluate(() => {
      const left = document.querySelectorAll(".item-left div div a");
      const right = document.querySelectorAll(".item-right div div a");
      const bottom = document.querySelectorAll(".item-bottom div div a");

      // Función para extraer atributos de un nodo
      const extractAttributes = (node) => {
        const attrs = {};
        for (const attr of node.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      };

      // Extrae atributos de <a> y <img> (si existe) en los elementos
      const extractElementsAttributes = (elements) => {
        return Array.from(elements).map((ele) => {
          const aAttributes = extractAttributes(ele);
          const imgElement = ele.querySelector("img");
          const imgAttributes = imgElement
            ? extractAttributes(imgElement)
            : null;

          return { ...aAttributes, ...imgAttributes };
        });
      };

      const leftAttributes = extractElementsAttributes(left);
      const rightAttributes = extractElementsAttributes(right);
      const bottomAttributes = extractElementsAttributes(bottom);

      return {
        left: leftAttributes,
        right: rightAttributes,
        bottom: bottomAttributes,
      };
    });

    // Cierra el navegador
    await browser.close();
    res.status(200).send(elementos);
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
