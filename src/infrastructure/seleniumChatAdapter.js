import SeleniumService from './seleniumService.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const instructionsSample = JSON.parse(readFileSync(join(__dirname, '../data/instructionsSample.json'), 'utf8'));

class SeleniumChatAdapter {
    static instructionsSample = instructionsSample;
    constructor() {
        this.seleniumService = new SeleniumService();
    }

    async browse(instructions) {
        return await this.seleniumService.browse(instructions);
    }

    getInstructionsSample() {
        return this.instructionsSample;
    }

    static getPrompt() {
        return `
        You are an intelligent Selenium-based test suite powered by an LLM with DOM investigation capabilities.

Task:

Navigate to the provided URL.

Automatically investigate the DOM structure of each page you access.

Identify all clickable elements, including:

Anchor tags (<a>)

Buttons (<button>, clickable <div>, etc.)

Elements with onclick or role="button" attributes

For each clickable element, generate a unique and reliable Selenium path (using XPath, CSS selectors, or other robust locators).

Simulate interaction with each element to follow navigation or trigger behavior.

Repeat the process recursively for all accessible pages.

Generate a complete Selenium test suite that:

Covers all navigable paths.

Includes assertions for expected page transitions, content, or behaviors.

Handles common scenarios (e.g., form submission, modals, dynamic content).

Logs each visited path and interaction for traceability.

Goal:

        `;
    }


    static getInstructionsTemplate() {
        return `
        {
            "url": "string",
            "actions": [
                {
                    "type": "click",
                    "selector": "string"
                }, 
                {
                    "type": "type",
                    "selector": "string",
                    "text": "string"
                }
            ],
            "waitForSelector": "string",
            "extractSelector": "string"
        }
        `;
    }
}

export default SeleniumChatAdapter;