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
                        await this.driver.wait(until.elementLocated(By.css(action.selector)));
                        await this.driver.findElement(By.css(action.selector)).click();
                        break;
                    case 'type':
                        await this.driver.wait(until.elementLocated(By.css(action.selector)));
                        await this.driver.findElement(By.css(action.selector)).sendKeys(action.text);
                        break;
                    case 'wait':
                        await this.driver.sleep(action.duration);
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
                result = await element.getAttribute('innerHTML');
            } else {
                result = await this.driver.getPageSource();
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