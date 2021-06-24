'use strict';

//TODO:page1を2回回してる？
//TODO:chintaiページにリンクしてほしい

const puppeteer = require('puppeteer');
const Discord = require('./module/discord-notify.js');
const conf = require('config');
const env = require('dotenv').config();
var fs = require('fs')
var util = require('util');
const { getHeapCodeStatistics } = require('v8');
const { url } = require('inspector');
const HEADLESS = conf.HEADLESS;
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
var discord = new Discord(env.parsed.DISCORD, "boter");

const login = async (page) => {
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: ['networkidle2'] }),
      await page.goto(conf.URL_MN_BASE + conf.URL_MN_PAGES.login)
    ]);
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
    var list = conf.TARGET_LOCATIONS;
    let urlSearch = new URL(conf.URL_MN_BASE + conf.URL_MN_PAGES.search);
    urlSearch.searchParams.set('s', 'score')
    for (let i = 0; i < list.length; i++) {
      console.log(list[i])
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
    //await page.bringToFront();
    console.log(pageUrl + conf.URL_MN_PAGES.chintai)
    await Promise.all([
      page.waitForNavigation({ waitUntil: ['networkidle2'] }),
      await page.goto(pageUrl + conf.URL_MN_PAGES.chintai)
    ]);
    await page.evaluate((selector) => {
      return document.querySelector(selector).textContent;
    }, "#gsub > div.container > section > div > ul > li.active > a > span").then(value => { return parseInt(value) != 0; }).then(isSale => {if(isSale) {discord.send(pageUrl + conf.URL_MN_PAGES.chintai);}});
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
