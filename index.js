const app = require("express")();
const chrome = require("@sparticuz/chromium");
const production = process.env.NODE_ENV === "production";
const wavPlayer = require("node-wav-player");

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

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // ! se puede cambiar  "*" para habilitar todos los puertos y evitar problemas de CORS
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  next();
});

app.get("/api/:character", async (req, res, next) => {
  const { character } = req.params;
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`;

  try {
    // wavPlayer
    //   .play({
    //     path: "./sounds/bep.wav",
    //   })
    //   .then(() => {
    //     console.log("Sonido reproducido!");
    //   })
    //   .catch((error) => {
    //     console.error("Error al reproducir el sonido:", error);
    //   });
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
    await page.waitForSelector(".item-left div div a", { timeout: 15000 }); // Especifica un selector que esperas ver en la página

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
    console.log("Scrap here");
    res.status(200).send(elementos);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || err;
  console.error("esto es err: ", err);
  res.status(status).send(message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started port", PORT);
});

module.exports = app;
