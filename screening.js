'use strict';

const puppeteer = require('puppeteer');
const Discord = require('./module/discord-notify.js');
const conf = require('config');
const env = require('dotenv').config();
const HEADLESS = conf.HEADLESS;
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
var discord = new Discord(env.parsed.DISCORD, "boter");
const patternMadori = new RegExp(conf.TARGET_MADORI_REGEX);

const login = async (page) => {
  try {
    await page.setUserAgent(conf.USER_AGENT);
    await Promise.all([
      page.waitForNavigation({ waitUntil: ['networkidle2'] }),
      await page.goto(conf.URL_MN_BASE + conf.URL_MN_PAGES.login)
    ]);
    await sleep(conf.INTERVAL*3)
    await Promise.all([
      page.waitForSelector("#mail"),
      await page.type("#mail", env.parsed.ID),
      page.waitForSelector("#password"),
      await page.type("#password", env.parsed.PW)
    ]);
    await Promise.all([
      await page.click("#login-form > div.btn-box > button")
    ]);
  } catch (error) {
    console.log(error)
  } finally {
    console.log("LOG-IN FINISH")
    return
  }
};

const search = async (browser, page) => {
  try {
    var list = conf.TARGET_LOCATIONS_LIST;
    let urlSearch = new URL(conf.URL_MN_BASE + conf.URL_MN_PAGES.search);
    urlSearch.searchParams.set('s', 'score')
    for (let i = 0; i < list.length; i++) {
      console.log(list[i])
      discord.send(list[i])
      urlSearch.searchParams.set('q', list[i])
      for (let p = 0; p < conf.PAGES; p++) {
        urlSearch.searchParams.set('p', p + 1)
        await Promise.all([
          page.waitForNavigation({ waitUntil: ['networkidle2'] }),
          await page.goto(urlSearch.href),
        ]);
        var itemList = await page.$$('#gsub > div.container > div > div > div.grid.grid4 > section > div > div:nth-child(2) > div > ul > li > div > a');
        for (let item = 0; item < itemList.length; item++) {
          await Promise.all([
            await sleep(conf.INTERVAL),
            validate(browser, await (await itemList[item].getProperty('href')).jsonValue())
          ]);
        }
        await sleep(conf.INTERVAL)
      }
    }
  } catch (error) {
    console.log(error)
  } finally {
    console.log("SEARCH FINISH")
    return
  }
}

const validate = async (browser, pageUrl) => {
  const page = await browser.newPage();
  try {
    console.log(pageUrl + conf.URL_MN_PAGES.chintai)
    await Promise.all([
      page.waitForNavigation({ waitUntil: ['networkidle2'] }),
      await page.goto(pageUrl + conf.URL_MN_PAGES.chintai)
    ]);

    //ScreenShot
    const targetElementSelector = '#gsub > div.container > section > div > div'
    const clip = await page.evaluate(s => {
      const el = document.querySelector(s)
  
      // ??????????????????????????????????????????
      const { width, height, top: y, left: x } = el.getBoundingClientRect()
      return { width, height, x, y }
    }, targetElementSelector)
    // ???????????????????????????????????????????????????????????????clip??????
    await page.screenshot({ clip, path: 'ss.png' })

    //?????????
    let name = await page.evaluate((selector) => {
      return document.querySelector(selector).textContent;
    }, "#gsub > div.container > div.mansion-detail-header > div > div.mansion-detail-header-names > h1 > div").then(value => { return value });

    //?????????????????????????????????????????????????????????
    let isSale = await page.evaluate((selector) => {
      return document.querySelector(selector).textContent;
    }, "#gsub > div.container > section > div > ul > li.active > a > span").then(value => { return parseInt(value) != 0; });
    console.log("isSaleChintai:")
    console.log(isSale)
    if(isSale){
      let madoriDOMList = await page.$$('#gsub > div.container > section > div > div > table > tbody > tr > td:nth-child(5)');
      let madoriList = [];
      let kakakuDOMList = await page.$$('#gsub > div.container > section > div > div > table > tbody > tr > td:nth-child(2)');
      let kakakuList = [];
      for (let i = 0; i < madoriDOMList.length; i++) {
        let madori =  await (await madoriDOMList[i].getProperty('textContent')).jsonValue().then(value => { return value; })
        madoriList.push(madori);
        let kakaku =  await (await kakakuDOMList[i].getProperty('textContent')).jsonValue().then(value => { return value.match(/\b([\d]*)\b/)[0]; })
        kakakuList.push(kakaku);
      }
      for(let i = 0; i < madoriList.length; i++){
        if(madoriList[i].match(patternMadori) != null && kakakuList[i] <= conf.TARGET_PRICE ){
          discord.send(name + "\n" + pageUrl + conf.URL_MN_PAGES.chintai,"ss.png");
          break
        }
      }
    }
  } catch (error) {

  } finally {
    console.log("CHECK FINISH")
    page.close()
    return
  }
}

const main = async () => {
  const browser = await puppeteer.launch({ headless: HEADLESS, defaultViewport: null,args:['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await login(page)
    .then(res => search(browser, page));
  browser.close()
}

main()
