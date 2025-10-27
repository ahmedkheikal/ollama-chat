// Tool interface for LLM tools
export class Tool {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    // Override in subclasses
    async execute(params) {
        throw new Error('Tool.execute() must be implemented by subclass');
    }

    // Get tool schema for LLM
    getSchema() {
        throw new Error('Tool.getSchema() must be implemented by subclass');
    }

    // Validate parameters
    validateParams(params) {
        return true; // Override in subclasses for specific validation
    }
}

// Tool result class
export class ToolResult {
    constructor(success, data, error = null) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }

    static success(data) {
        return new ToolResult(true, data);
    }

    static error(error, data = null) {
        return new ToolResult(false, data, error);
    }
}

// Tool registry for managing available tools
export class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    register(tool) {
        if (!(tool instanceof Tool)) {
            throw new Error('Tool must be an instance of Tool class');
        }
        this.tools.set(tool.name, tool);
    }

    getTool(name) {
        return this.tools.get(name);
    }

    getAllTools() {
        return Array.from(this.tools.values());
    }

    getToolSchemas() {
        return this.getAllTools().map(tool => tool.getSchema());
    }

    async executeTool(name, params) {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }

        if (!tool.validateParams(params)) {
            throw new Error(`Invalid parameters for tool '${name}'`);
        }

        try {
            return await tool.execute(params);
        } catch (error) {
            return ToolResult.error(error.message);
        }
    }
}
