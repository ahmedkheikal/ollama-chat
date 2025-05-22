import { log } from 'console';
import { Builder, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';
    
class SeleniumService {
    constructor() {
        this.driver = null;
    }

    async initialize() {
        if (!this.driver) {
            const options = new Options();
            options.addArguments('--headless=new'); // Updated headless mode syntax
            options.addArguments('--no-sandbox');
            options.addArguments('--disable-dev-shm-usage');

            this.driver = await new Builder()
                .forBrowser('chrome')
                .setChromeOptions(options)
                .build();
        }
    }

    async browse(instructions) {
        try {
            await this.initialize();

            // Parse instructions
            const { url, actions = [], waitForSelector, extractSelector } = instructions;

            // Navigate to URL
            await this.driver.get(url);

            // Perform actions if any
            for (const action of actions) {
                switch (action.type) {
                    case 'click':
                        console.log("Clicking element:", action.selector);
                        try {
                            await this.driver.wait(until.elementLocated(By.xpath(action.selector)), 1000, "Element not found");
                            console.log("Element located:", action.selector);
                            await this.driver.findElement(By.xpath(action.selector)).click();
                            console.log("Clicked element:", action.selector);
                        } catch (error) {
                            console.error("Error clicking element:", action.selector, error);
                        }
                        break;
                    case 'type':
                        try {
                            await this.driver.wait(until.elementLocated(By.xpath(action.selector)), 10000);
                            await this.driver.findElement(By.css(action.selector)).sendKeys(action.text);
                            console.log("Typed text:", action.text);
                        } catch (error) {
                            console.error("Error typing text:", action.selector, error);
                        }
                        break;
                    case 'wait':
                        await this.driver.sleep(action.duration);
                        console.log("Waited for:", action.duration);
                        break;
                }
            }

            // Wait for specific element if specified
            if (waitForSelector) {
                await this.driver.wait(until.elementLocated(By.css(waitForSelector)));
            }

            // Extract content if selector is provided
            let result = '';
            if (extractSelector) {
                const element = await this.driver.findElement(By.css(extractSelector));
                console.log("Element:", element);
                result = await element.getAttribute('innerHTML');
            } else {
                result = await this.driver.getPageSource();
                console.log("Result:", result);
            }

            return result;
        } catch (error) {
            throw new Error(`Selenium browsing failed: ${error.message}`);
        }
    }

    async close() {
        if (this.driver) {
            await this.driver.quit();
            this.driver = null;
        }
    }
}

export default SeleniumService; 