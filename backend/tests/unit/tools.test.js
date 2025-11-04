import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Tool, ToolResult, ToolRegistry } from '../../src/domain/tools.js';
import WebBrowsingTool from '../../src/infrastructure/webBrowsingTool.js';
import ToolManager from '../../src/application/toolManager.js';

// Mock SeleniumService
jest.mock('../../src/infrastructure/seleniumService.js', () => {
    return jest.fn().mockImplementation(() => ({
        browse: jest.fn(),
        close: jest.fn()
    }));
});

describe('Tool System', () => {
    describe('Tool', () => {
        class TestTool extends Tool {
            constructor() {
                super('test_tool', 'A test tool');
            }

            getSchema() {
                return {
                    name: this.name,
                    description: this.description,
                    parameters: {
                        type: 'object',
                        properties: {
                            input: { type: 'string' }
                        },
                        required: ['input']
                    }
                };
            }

            async execute(params) {
                return ToolResult.success({ result: `Processed: ${params.input}` });
            }
        }

        let tool;

        beforeEach(() => {
            tool = new TestTool();
        });

        it('should create tool with name and description', () => {
            expect(tool.name).toBe('test_tool');
            expect(tool.description).toBe('A test tool');
        });

        it('should execute tool and return success result', async () => {
            const result = await tool.execute({ input: 'test' });
            expect(result.success).toBe(true);
            expect(result.data.result).toBe('Processed: test');
        });

        it('should return tool schema', () => {
            const schema = tool.getSchema();
            expect(schema.name).toBe('test_tool');
            expect(schema.parameters).toBeDefined();
        });
    });

    describe('ToolResult', () => {
        it('should create success result', () => {
            const result = ToolResult.success({ data: 'test' });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ data: 'test' });
            expect(result.error).toBeNull();
        });

        it('should create error result', () => {
            const result = ToolResult.error('Test error');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
            expect(result.data).toBeNull();
        });
    });

    describe('ToolRegistry', () => {
        let registry;
        let testTool;

        beforeEach(() => {
            registry = new ToolRegistry();
            testTool = new Tool('test', 'Test tool');
            testTool.getSchema = jest.fn().mockReturnValue({ name: 'test' });
            testTool.execute = jest.fn().mockResolvedValue(ToolResult.success({}));
        });

        it('should register and retrieve tools', () => {
            registry.register(testTool);
            expect(registry.getTool('test')).toBe(testTool);
        });

        it('should return all tools', () => {
            registry.register(testTool);
            const tools = registry.getAllTools();
            expect(tools).toContain(testTool);
        });

        it('should execute tool successfully', async () => {
            registry.register(testTool);
            const result = await registry.executeTool('test', {});
            expect(result.success).toBe(true);
        });

        it('should throw error for non-existent tool', async () => {
            await expect(registry.executeTool('nonexistent', {}))
                .rejects.toThrow("Tool 'nonexistent' not found");
        });
    });

    describe('WebBrowsingTool', () => {
        let tool;
        let mockSeleniumService;

        beforeEach(() => {
            // Get the mocked SeleniumService constructor
            const SeleniumService = require('../../src/infrastructure/seleniumService.js');
            mockSeleniumService = new SeleniumService();
            
            // Setup mock return values
            mockSeleniumService.browse.mockResolvedValue({
                targetUrl: 'https://example.com',
                flows: [{ name: 'test_flow' }],
                errors: [],
                pageSource: '<html>test</html>'
            });

            tool = new WebBrowsingTool(mockSeleniumService);
        });

        it('should create web browsing tool', () => {
            expect(tool.name).toBe('web_browse');
            expect(tool.description).toContain('Browse and extract information');
        });

        it('should return proper schema', () => {
            const schema = tool.getSchema();
            expect(schema.name).toBe('web_browse');
            expect(schema.parameters.properties.url).toBeDefined();
            expect(schema.parameters.properties.instructions).toBeDefined();
        });

        it('should validate URL parameters', () => {
            expect(tool.validateParams({ url: 'https://example.com' })).toBe(true);
            expect(tool.validateParams({ url: 'invalid-url' })).toBe(false);
            expect(tool.validateParams({})).toBe(false);
        });

        it('should execute browsing successfully', async () => {
            const result = await tool.execute({ url: 'https://example.com' });
            console.log('Result:', result);
            expect(result.success).toBe(true);
            expect(result.data.url).toBe('https://example.com');
            expect(mockSeleniumService.browse).toHaveBeenCalled();
        });

        it('should handle browsing errors', async () => {
            mockSeleniumService.browse.mockRejectedValue(new Error('Browsing failed'));
            const result = await tool.execute({ url: 'https://example.com' });
            expect(result.success).toBe(false);
            expect(result.error).toContain('Web browsing failed');
        });
    });

    describe('ToolManager', () => {
        let toolManager;
        let mockWebBrowsingTool;

        beforeEach(() => {
            // Create a mock WebBrowsingTool that extends Tool
            class MockWebBrowsingTool extends Tool {
                constructor() {
                    super('web_browse', 'Browse and extract information from web pages');
                }

                getSchema() {
                    return {
                        name: 'web_browse',
                        description: 'Browse and extract information from web pages',
                        parameters: { type: 'object' }
                    };
                }

                async execute(params) {
                    return { success: true, data: { url: 'https://example.com' } };
                }

                validateParams(params) {
                    return true;
                }

                async cleanup() {
                    // Mock cleanup
                }
            }

            mockWebBrowsingTool = new MockWebBrowsingTool();
            toolManager = new ToolManager([mockWebBrowsingTool]);
        });

        it('should initialize with web browsing tool', () => {
            const tools = toolManager.getAvailableTools();
            expect(tools.length).toBeGreaterThan(0);
            expect(tools.some(tool => tool.name === 'web_browse')).toBe(true);
        });

        it('should detect web browsing tool usage', () => {
            const detectedTools = toolManager.detectToolUsage('browse https://example.com');
            expect(detectedTools.length).toBeGreaterThan(0);
            expect(detectedTools[0].tool).toBe('web_browse');
            expect(detectedTools[0].url).toBe('https://example.com');
        });

        it('should parse tool parameters', () => {
            const detectedTools = toolManager.detectToolUsage('browse https://example.com');
            const params = toolManager.parseToolParams('browse https://example.com', detectedTools);
            expect(params.length).toBeGreaterThan(0);
            expect(params[0].tool).toBe('web_browse');
            expect(params[0].params.url).toBe('https://example.com');
        });

        it('should execute tool successfully', async () => {
            const result = await toolManager.executeTool('web_browse', { 
                url: 'https://example.com' 
            });
            expect(result.success).toBe(true);
        });
    });
});
