import { ToolRegistry } from '../domain/tools.js';
import WebBrowsingTool from '../infrastructure/webBrowsingTool.js';
import GitHubTool from '../infrastructure/githubTool.js';

class ToolManager {
    constructor(tools = []) {
        this.registry = new ToolRegistry();
        this.initializeTools(tools);
    }

    initializeTools(customTools = []) {
        // If custom tools provided, use them; otherwise create defaults
        if (customTools.length > 0) {
            customTools.forEach(tool => this.registry.register(tool));
        } else {
            // Register web browsing tool
            const webBrowsingTool = new WebBrowsingTool();
            this.registry.register(webBrowsingTool);
            
            // Register GitHub tool
            const githubTool = new GitHubTool();
            this.registry.register(githubTool);
        }

        // Future tools can be registered here
        // const searchTool = new SearchTool();
        // this.registry.register(searchTool);
    }

    async executeTool(toolName, params, actionName = null) {
        return await this.registry.executeTool(toolName, params, actionName);
    }

    getAvailableTools() {
        return this.registry.getAllTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            schema: tool.getSchema()
        }));
    }

    getToolSchemas() {
        return this.registry.getToolSchemas();
    }

    // Check if a message contains tool usage patterns
    detectToolUsage(message) {
        const toolPatterns = {
            web_browse: [
                /browse\s+(https?:\/\/[^\s]+)/i,
                /search\s+(https?:\/\/[^\s]+)/i,
                /visit\s+(https?:\/\/[^\s]+)/i,
                /go\s+to\s+(https?:\/\/[^\s]+)/i,
                /check\s+(https?:\/\/[^\s]+)/i
            ]
        };

        const detectedTools = [];

        for (const [toolName, patterns] of Object.entries(toolPatterns)) {
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match) {
                    detectedTools.push({
                        tool: toolName,
                        url: match[1],
                        match: match[0]
                    });
                }
            }
        }

        return detectedTools;
    }

    // Parse tool parameters from natural language
    parseToolParams(message, detectedTools) {
        const params = [];

        for (const detection of detectedTools) {
            switch (detection.tool) {
                case 'web_browse':
                    params.push({
                        tool: 'web_browse',
                        params: {
                            url: detection.url,
                            instructions: this.parseBrowsingInstructions(message, detection.url)
                        }
                    });
                    break;
            }
        }

        return params;
    }

    parseBrowsingInstructions(message, url) {
        // Enhanced parsing based on message content
        const instructions = {
            target: {
                url: url,
                description: `Browse ${url} based on user request: ${message}`
            },
            flows: [
                {
                    name: 'user_requested_extraction',
                    description: 'Extract content based on user request',
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

        // Add specific extractions based on keywords
        if (message.toLowerCase().includes('title') || message.toLowerCase().includes('heading')) {
            instructions.flows[0].extractions.push({
                name: 'page_title',
                description: 'Extract page title',
                selector: {
                    selector: 'h1, title',
                    strategy: 'css',
                    timeout: 3000
                },
                extractType: 'text'
            });
        }

        if (message.toLowerCase().includes('link') || message.toLowerCase().includes('href')) {
            instructions.flows[0].extractions.push({
                name: 'page_links',
                description: 'Extract page links',
                selector: {
                    selector: 'a[href]',
                    strategy: 'css',
                    timeout: 3000
                },
                extractType: 'attribute',
                attribute: 'href',
                all: true
            });
        }

        return instructions;
    }

    async cleanup() {
        // Cleanup all tools
        const tools = this.registry.getAllTools();
        for (const tool of tools) {
            if (typeof tool.cleanup === 'function') {
                await tool.cleanup();
            }
        }
    }
}

export default ToolManager;
