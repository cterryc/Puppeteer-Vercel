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

app.get("/api", async (req, res) => {
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

    let page = await browser.newPage();
    await page.goto("https://www.google.com");
    res.send(await page.title());
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
