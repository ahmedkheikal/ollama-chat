// Tool Action definition
export class ToolAction {
    constructor(name, description, schema, executeFn, validateFn = null) {
        this.name = name;
        this.description = description;
        this.schema = schema;
        this.executeFn = executeFn;
        this.validateFn = validateFn;
    }

    async execute(params) {
        return await this.executeFn(params);
    }

    validateParams(params) {
        if (this.validateFn) {
            return this.validateFn(params);
        }
        return true;
    }
}

// Tool interface for LLM tools
export class Tool {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.actions = new Map();
    }

    /**
     * Register an action for this tool
     * @param {string} actionName - Name of the action
     * @param {string} actionDescription - Description of what the action does
     * @param {object} actionSchema - JSON Schema for the action parameters
     * @param {function} executeFn - Async function to execute the action
     * @param {function} validateFn - Optional function to validate parameters
     */
    registerAction(actionName, actionDescription, actionSchema, executeFn, validateFn = null) {
        const action = new ToolAction(actionName, actionDescription, actionSchema, executeFn, validateFn);
        this.actions.set(actionName, action);
    }

    /**
     * Get action by name
     */
    getAction(actionName) {
        return this.actions.get(actionName);
    }

    /**
     * Get all actions for this tool
     */
    getAllActions() {
        return Array.from(this.actions.values());
    }

    /**
     * Execute a specific action
     */
    async executeAction(actionName, params) {
        const action = this.getAction(actionName);
        if (!action) {
            throw new Error(`Action '${actionName}' not found in tool '${this.name}'`);
        }

        if (!action.validateParams(params)) {
            throw new Error(`Invalid parameters for action '${actionName}' in tool '${this.name}'`);
        }

        return await action.execute(params);
    }

    // Legacy methods for backward compatibility
    async execute(params) {
        // If no actions registered, throw error
        if (this.actions.size === 0) {
            throw new Error('Tool has no actions registered. Use registerAction() to add actions.');
        }
        
        // If only one action exists, use it as default
        if (this.actions.size === 1) {
            const defaultAction = this.getAllActions()[0];
            return await defaultAction.execute(params);
        }

        throw new Error('Tool has multiple actions. Specify action name in tool call.');
    }

    // Get tool schema - returns all actions
    getSchema() {
        return {
            name: this.name,
            description: this.description,
            actions: this.getAllActions().map(action => ({
                name: action.name,
                description: action.description,
                parameters: action.schema
            }))
        };
    }

    // Get action schemas for system prompt
    getActionSchemas() {
        return this.getAllActions().map(action => ({
            tool: this.name,
            action: action.name,
            description: action.description,
            parameters: action.schema
        }));
    }

    // Validate parameters (legacy - validates default action)
    validateParams(params) {
        if (this.actions.size === 0) {
            return false;
        }
        if (this.actions.size === 1) {
            const defaultAction = this.getAllActions()[0];
            return defaultAction.validateParams(params);
        }
        return true;
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

    getAllActionSchemas() {
        const actionSchemas = [];
        this.getAllTools().forEach(tool => {
            actionSchemas.push(...tool.getActionSchemas());
        });
        return actionSchemas;
    }

    async executeTool(name, params, actionName = null) {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }

        // If action name is provided, execute specific action
        if (actionName) {
            return await tool.executeAction(actionName, params);
        }

        // Otherwise use legacy execute method
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
