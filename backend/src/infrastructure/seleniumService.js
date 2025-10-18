import { Builder, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js';

class SeleniumService {
    constructor() {
        this.driver = null;
        this.defaultTimeout = 10000;
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

    getLocator(selector, strategy = 'css') {
        const normalizedStrategy = (strategy || 'css').toLowerCase();
        switch (normalizedStrategy) {
            case 'css':
                return By.css(selector);
            case 'xpath':
                return By.xpath(selector);
            case 'id':
                return By.id(selector);
            case 'name':
                return By.name(selector);
            case 'tag':
            case 'tagname':
                return By.tagName(selector);
            case 'class':
            case 'classname':
                return By.className(selector);
            case 'linktext':
                return By.linkText(selector);
            case 'partiallinktext':
                return By.partialLinkText(selector);
            default:
                throw new Error(`Unsupported selector strategy: ${strategy}`);
        }
    }

    isLocatorStrategy(strategy) {
        if (!strategy || typeof strategy !== 'string') {
            return false;
        }

        const normalized = strategy.toLowerCase();
        return [
            'css',
            'xpath',
            'id',
            'name',
            'tag',
            'tagname',
            'class',
            'classname',
            'linktext',
            'partiallinktext',
        ].includes(normalized);
    }

    isActionType(type) {
        if (!type || typeof type !== 'string') {
            return false;
        }

        const normalized = type.toLowerCase();
        return ['click', 'type', 'wait', 'navigate'].includes(normalized);
    }

    normalizeSelectorConfig(config, defaultStrategy = 'css') {
        if (!config) {
            return null;
        }

        if (typeof config === 'string') {
            return {
                selector: config,
                strategy: defaultStrategy,
                timeout: this.defaultTimeout,
            };
        }

        if (typeof config === 'object') {
            if (config.selector && typeof config.selector === 'object') {
                const nestedConfig = this.normalizeSelectorConfig(config.selector, defaultStrategy);
                return {
                    ...nestedConfig,
                    strategy: config.strategy || config.selector.strategy || nestedConfig.strategy || defaultStrategy,
                    timeout: config.timeout ?? nestedConfig.timeout ?? this.defaultTimeout,
                    attribute: config.attribute ?? nestedConfig.attribute,
                    extractType: config.extractType ?? nestedConfig.extractType,
                };
            }

            const selectorValue =
                config.selector ?? config.value ?? config.locator ?? config.path ?? config.element;

            if (!selectorValue) {
                throw new Error('Selector configuration is missing "selector" property.');
            }

            if (typeof selectorValue === 'object') {
                return this.normalizeSelectorConfig(
                    {
                        ...selectorValue,
                        strategy:
                            selectorValue.strategy || selectorValue.type || config.strategy || config.selectorType,
                        timeout: config.timeout ?? selectorValue.timeout,
                        attribute: config.attribute ?? selectorValue.attribute,
                        extractType: config.extractType ?? selectorValue.extractType,
                    },
                    defaultStrategy,
                );
            }

            const candidateStrategy =
                config.strategy || config.selectorType || config.locatorType || config.by || config.using;
            const strategyValue = this.isLocatorStrategy(candidateStrategy)
                ? candidateStrategy
                : defaultStrategy;

            return {
                selector: selectorValue,
                strategy: strategyValue,
                timeout: config.timeout ?? this.defaultTimeout,
                attribute: config.attribute,
                extractType: config.extractType,
            };
        }

        throw new Error('Invalid selector configuration provided.');
    }

    resolveSelectorConfig(target, defaultStrategy = 'css') {
        if (target == null) {
            return null;
        }

        if (typeof target === 'object' && Object.prototype.hasOwnProperty.call(target, 'selector')) {
            const selectorValue = target.selector;

            if (selectorValue && typeof selectorValue === 'object') {
                return this.normalizeSelectorConfig(
                    {
                        ...selectorValue,
                        strategy:
                            selectorValue.strategy ||
                            selectorValue.selectorType ||
                            selectorValue.locatorType ||
                            selectorValue.by ||
                            target.strategy ||
                            target.selectorType ||
                            target.locatorType ||
                            defaultStrategy,
                        timeout: target.timeout ?? selectorValue.timeout,
                        attribute: target.attribute ?? selectorValue.attribute,
                        extractType: target.extractType ?? selectorValue.extractType,
                    },
                    defaultStrategy,
                );
            }

            return this.normalizeSelectorConfig(
                {
                    selector: selectorValue,
                    strategy:
                        target.strategy ||
                        target.selectorType ||
                        target.locatorType ||
                        target.by ||
                        target.using ||
                        defaultStrategy,
                    timeout: target.timeout,
                    attribute: target.attribute,
                    extractType:
                        target.extractType ||
                        (this.isLocatorStrategy(target.type) || this.isActionType(target.type)
                            ? undefined
                            : target.type),
                },
                defaultStrategy,
            );
        }

        return this.normalizeSelectorConfig(target, defaultStrategy);
    }

    async waitForElement(selectorConfig, timeout = this.defaultTimeout) {
        const locator = this.getLocator(selectorConfig.selector, selectorConfig.strategy);
        await this.driver.wait(until.elementLocated(locator), timeout);
        const element = await this.driver.findElement(locator);
        try {
            await this.driver.wait(until.elementIsVisible(element), timeout);
        } catch (error) {
            // Visibility wait is best-effort; continue even if it times out
            if (error && error.name !== 'TimeoutError') {
                console.warn('Element visibility wait failed:', error.message);
            }
        }
        return element;
    }

    buildFlowList(instructions) {
        if (!instructions || typeof instructions !== 'object') {
            return [];
        }

        if (Array.isArray(instructions.flows) && instructions.flows.length > 0) {
            return instructions.flows;
        }

        const actions = Array.isArray(instructions.actions) ? instructions.actions : [];
        const extractions = Array.isArray(instructions.extractions)
            ? instructions.extractions
            : instructions.extractSelector
                ? [
                      {
                          name: 'extraction_1',
                          selector: instructions.extractSelector,
                          extractType: instructions.extractType ?? 'text',
                      },
                  ]
                : [];

        return [
            {
                name: instructions.flowName || 'default_flow',
                description:
                    instructions.flowDescription ||
                    'Flow automatically generated from legacy instruction format.',
                steps: actions,
                extractions,
            },
        ];
    }

    normalizeExtractions(rawExtractions) {
        if (!rawExtractions) {
            return [];
        }

        const extractionsArray = Array.isArray(rawExtractions) ? rawExtractions : [rawExtractions];

        return extractionsArray.map((extraction, index) => {
            if (typeof extraction === 'string') {
                return {
                    name: `extraction_${index + 1}`,
                    selector: extraction,
                    extractType: 'text',
                };
            }

            if (typeof extraction === 'object' && extraction !== null) {
                return {
                    name: extraction.name || `extraction_${index + 1}`,
                    description: extraction.description,
                    selector: extraction.selector ?? extraction.target ?? extraction.locator ?? extraction,
                    extractType: extraction.extractType ?? extraction.type ?? 'text',
                    attribute: extraction.attribute,
                    all: extraction.all ?? false,
                };
            }

            throw new Error('Invalid extraction configuration provided.');
        });
    }

    normalizeFlowSteps(rawSteps) {
        if (!rawSteps) {
            return [];
        }

        return rawSteps
            .map((step) => {
                if (!step) {
                    return null;
                }

                if (typeof step === 'string') {
                    return { type: 'click', selector: step };
                }

                if (typeof step === 'object') {
                    return {
                        ...step,
                        type: step.type || step.action,
                    };
                }

                return null;
            })
            .filter(Boolean);
    }

    async executeFlowStep(step) {
        const type = (step.type || '').toLowerCase();

        switch (type) {
            case 'click': {
                const selectorConfig = this.resolveSelectorConfig(step, 'css');
                if (!selectorConfig || !selectorConfig.selector) {
                    throw new Error('Missing selector for click action.');
                }
                const timeout = step.timeout ?? selectorConfig.timeout ?? this.defaultTimeout;
                const element = await this.waitForElement(selectorConfig, timeout);
                await element.click();
                return `Clicked element ${selectorConfig.selector}`;
            }
            case 'type': {
                const selectorConfig = this.resolveSelectorConfig(step, 'css');
                if (!selectorConfig || !selectorConfig.selector) {
                    throw new Error('Missing selector for type action.');
                }
                const timeout = step.timeout ?? selectorConfig.timeout ?? this.defaultTimeout;
                const element = await this.waitForElement(selectorConfig, timeout);
                if (step.clear) {
                    await element.clear();
                }
                const text = step.text ?? step.value ?? '';
                await element.sendKeys(text);
                return `Typed into ${selectorConfig.selector}`;
            }
            case 'wait': {
                if (step.selector || step.locator) {
                    const selectorTarget = step.selector || step.locator;
                    const selectorConfig = this.resolveSelectorConfig(
                        typeof selectorTarget === 'string'
                            ? {
                                  selector: selectorTarget,
                                  strategy: step.strategy,
                                  timeout: step.timeout,
                              }
                            : {
                                  ...selectorTarget,
                                  strategy: selectorTarget.strategy ?? step.strategy,
                                  timeout: selectorTarget.timeout ?? step.timeout,
                              },
                        'css',
                    );
                    if (!selectorConfig || !selectorConfig.selector) {
                        throw new Error('Invalid selector for wait action.');
                    }
                    const timeout = step.timeout ?? selectorConfig.timeout ?? this.defaultTimeout;
                    await this.waitForElement(selectorConfig, timeout);
                    return `Waited for element ${selectorConfig.selector}`;
                }

                const duration = step.duration ?? step.time ?? 0;
                if (duration > 0) {
                    await this.driver.sleep(duration);
                }
                return `Slept for ${duration}ms`;
            }
            case 'navigate': {
                const targetUrl = step.url ?? step.href;
                if (!targetUrl) {
                    throw new Error('Navigate action requires a url.');
                }
                await this.driver.get(targetUrl);
                return `Navigated to ${targetUrl}`;
            }
            default:
                throw new Error(`Unsupported action type: ${step.type}`);
        }
    }

    async runExtractions(extractions) {
        const results = {};

        for (const extraction of extractions) {
            const selectorConfig = this.resolveSelectorConfig(extraction.selector ?? extraction, 'css');
            if (!selectorConfig || !selectorConfig.selector) {
                throw new Error(`Invalid selector for extraction "${extraction.name}".`);
            }

            const element = await this.waitForElement(
                selectorConfig,
                selectorConfig.timeout ?? this.defaultTimeout,
            );

            if (extraction.all) {
                const elements = await this.driver.findElements(
                    this.getLocator(selectorConfig.selector, selectorConfig.strategy),
                );
                results[extraction.name] = await Promise.all(
                    elements.map(async (singleElement) => {
                        if (selectorConfig.attribute || extraction.attribute) {
                            return singleElement.getAttribute(
                                selectorConfig.attribute ?? extraction.attribute,
                            );
                        }
                        if (
                            (selectorConfig.extractType ?? extraction.extractType ?? extraction.type) ===
                            'html'
                        ) {
                            return singleElement.getAttribute('innerHTML');
                        }
                        return singleElement.getText();
                    }),
                );
                continue;
            }

            if (selectorConfig.attribute || extraction.attribute) {
                results[extraction.name] = await element.getAttribute(
                    selectorConfig.attribute ?? extraction.attribute,
                );
            } else if (
                (selectorConfig.extractType ?? extraction.extractType ?? extraction.type) === 'html'
            ) {
                results[extraction.name] = await element.getAttribute('innerHTML');
            } else {
                results[extraction.name] = await element.getText();
            }
        }

        return results;
    }

    async browse(rawInstructions) {
        try {
            await this.initialize();

            const instructions =
                typeof rawInstructions === 'string' ? JSON.parse(rawInstructions) : rawInstructions;
            if (!instructions || typeof instructions !== 'object') {
                throw new Error('Invalid browsing instructions provided.');
            }

            const targetUrl = instructions?.target?.url ?? instructions.url;
            if (!targetUrl) {
                throw new Error('Browsing instructions must include a target url.');
            }

            const flows = this.buildFlowList(instructions);
            if (flows.length === 0) {
                throw new Error('No flows provided in browsing instructions.');
            }

            const executionSummary = [];
            const aggregatedErrors = [];

            for (const [index, flow] of flows.entries()) {
                if (targetUrl) {
                    await this.driver.get(targetUrl);
                }

                const steps = this.normalizeFlowSteps(flow.steps);
                const extractions = this.normalizeExtractions(flow.extractions);
                const flowResult = {
                    name: flow.name || `flow_${index + 1}`,
                    description: flow.description,
                    stepResults: [],
                    extractions: {},
                    errors: [],
                };

                for (const step of steps) {
                    try {
                        const result = await this.executeFlowStep(step);
                        flowResult.stepResults.push({
                            type: step.type,
                            details: result,
                        });
                    } catch (error) {
                        const message = `Error executing step ${step.type}: ${error.message}`;
                        flowResult.errors.push(message);
                        aggregatedErrors.push(message);
                    }
                }

                try {
                    flowResult.extractions = await this.runExtractions(extractions);
                } catch (error) {
                    const message = `Error during extraction: ${error.message}`;
                    flowResult.errors.push(message);
                    aggregatedErrors.push(message);
                }

                executionSummary.push(flowResult);
            }

            const pageSource = await this.driver.getPageSource();

            return {
                targetUrl,
                flows: executionSummary,
                errors: aggregatedErrors,
                pageSource,
            };
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