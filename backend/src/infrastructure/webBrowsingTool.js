import { Tool, ToolResult } from '../domain/tools.js';
import SeleniumService from './seleniumService.js';

export class WebBrowsingTool extends Tool {
    constructor(seleniumService = null) {
        super(
            'web_browse',
            'Browse and extract information from web pages using Selenium automation'
        );
        this.seleniumService = seleniumService || new SeleniumService();
        this.registerActions();
    }

    registerActions() {
        // Register browse action
        this.registerAction(
            'browse',
            'Browse a URL and extract information from the web page',
            {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL to browse'
                    },
                    instructions: {
                        type: 'object',
                        description: 'Detailed browsing instructions with flows and extractions',
                        properties: {
                            target: {
                                type: 'object',
                                properties: {
                                    url: { type: 'string' },
                                    description: { type: 'string' }
                                }
                            },
                            flows: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        steps: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    type: { 
                                                        type: 'string',
                                                        enum: ['navigate', 'wait', 'click', 'type']
                                                    },
                                                    url: { type: 'string' },
                                                    selector: { 
                                                        oneOf: [
                                                            { type: 'string' },
                                                            { 
                                                                type: 'object',
                                                                properties: {
                                                                    selector: { type: 'string' },
                                                                    strategy: { type: 'string' },
                                                                    timeout: { type: 'number' }
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    text: { type: 'string' },
                                                    duration: { type: 'number' }
                                                }
                                            }
                                        },
                                        extractions: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    description: { type: 'string' },
                                                    selector: { 
                                                        oneOf: [
                                                            { type: 'string' },
                                                            { 
                                                                type: 'object',
                                                                properties: {
                                                                    selector: { type: 'string' },
                                                                    strategy: { type: 'string' },
                                                                    timeout: { type: 'number' }
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    extractType: { 
                                                        type: 'string',
                                                        enum: ['text', 'html', 'attribute']
                                                    },
                                                    attribute: { type: 'string' },
                                                    all: { type: 'boolean' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                required: ['url']
            },
            async (params) => {
                const { url, instructions } = params;
                const browsingInstructions = instructions || this.createSimpleInstructions(url);
                const result = await this.seleniumService.browse(browsingInstructions);
                return ToolResult.success({
                    url: result.targetUrl,
                    data: result.flows,
                    errors: result.errors,
                    pageSource: result.pageSource
                });
            },
            (params) => {
                if (!params.url || typeof params.url !== 'string') {
                    return false;
                }
                try {
                    new URL(params.url);
                    return true;
                } catch {
                    return false;
                }
            }
        );
    }

    createSimpleInstructions(url) {
        return {
            target: {
                url: url,
                description: 'Simple page load and content extraction'
            },
            flows: [
                {
                    name: 'simple_extraction',
                    description: 'Load page and extract main content',
                    steps: [
                        {
                            type: 'navigate',
                            url: url
                        },
                        {
                            type: 'wait',
                            selector: {
                                selector: 'body',
                                strategy: 'css',
                                timeout: 5000
                            }
                        }
                    ],
                    extractions: [
                        {
                            name: 'page_content',
                            description: 'Extract main page content',
                            selector: {
                                selector: 'body',
                                strategy: 'css',
                                timeout: 5000
                            },
                            extractType: 'html'
                        }
                    ]
                }
            ]
        };
    }

    async cleanup() {
        await this.seleniumService.close();
    }
}

export default WebBrowsingTool;
