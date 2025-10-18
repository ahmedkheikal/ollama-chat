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
        return SeleniumChatAdapter.instructionsSample;
    }

    static getPrompt() {
        return `
You are an autonomous Selenium automation planner. Given a high level research task, design a structured scraping flow that can be executed safely by a Selenium handler.

Produce **valid JSON only** that matches the template below. The response must:
- Describe the primary page to open under "target".
- Break the browsing plan into one or more flows. Each flow should include:
  - A concise name and description of the objective.
  - An ordered list of Selenium steps (navigate, wait, click, type, etc.).
    * Every interaction MUST specify a locator via the "selector" field (string or object with selector + strategy) unless the step type is "navigate" or a pure timer wait.
    * Wait steps may either provide a duration (milliseconds) or a selector to wait for.
  - One or more extraction definitions describing what information to capture once the steps complete. Each extraction must supply a selector, desired extractType (text | html | attribute), optional attribute name, and whether all matching nodes should be returned.
- Avoid prose outside the JSON document.
- Default to CSS selectors unless a more stable XPath is required.
- Use timeouts in milliseconds when waiting for DOM readiness.

Only return the JSON object.
        `;
    }

    static getInstructionsTemplate() {
        return `
{
  "target": {
    "url": "https://example.com",
    "description": "Brief summary of why this page is opened"
  },
  "flows": [
    {
      "name": "collect_primary_content",
      "description": "Open the landing page and capture headline details",
      "steps": [
        {
          "type": "navigate",
          "url": "https://example.com"
        },
        {
          "type": "wait",
          "selector": {
            "selector": "main",
            "strategy": "css",
            "timeout": 7000
          }
        },
        {
          "type": "click",
          "selector": {
            "selector": "button.cta",
            "strategy": "css"
          }
        }
      ],
      "extractions": [
        {
          "name": "hero_title",
          "description": "Collect the hero section heading",
          "selector": {
            "selector": "header h1",
            "strategy": "css",
            "timeout": 5000
          },
          "extractType": "text"
        },
        {
          "name": "cta_link",
          "description": "Capture the destination of the CTA button",
          "selector": {
            "selector": "button.cta",
            "strategy": "css"
          },
          "extractType": "attribute",
          "attribute": "href"
        }
      ]
    }
  ]
}
        `;
    }
}

export default SeleniumChatAdapter;