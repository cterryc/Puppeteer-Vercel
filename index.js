const app = require("express")();
const chrome = require("@sparticuz/chromium");
const production = process.env.NODE_ENV === "production";

let puppeteer;
let browser;

if (production) {
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

(async () => {
  browser = await puppeteer.launch(
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
})();

app.get("/api/:character", async (req, res) => {
  const { character } = req.params;
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`;

  try {
    const page = await browser.newPage();

    // Configura la intercepción de solicitudes antes de la navegación
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navega a la página y espera a que los selectores clave se carguen
    await page.goto(urlCharacter, { timeout: 15000 });
    await page.waitForSelector(".item-left div div a"); // Especifica un selector que esperas ver en la página

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

    await page.close(); // Cierra la pestaña pero no el navegador
    res.status(200).send(elementos);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Error al procesar la solicitud" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
