class SystemPromptGenerator {
    constructor(toolManager = null) {
        this.toolManager = toolManager;
    }

    setToolManager(toolManager) {
        this.toolManager = toolManager;
    }

    generatePersona() {
        return `You are an intelligent and helpful AI assistant with advanced capabilities. 
You can help users with a wide variety of tasks including answering questions, 
providing information, and using specialized tools to interact with the web and other systems.

Your personality:
- Friendly, professional, and approachable
- Proactive in suggesting helpful actions
- Clear and concise in your explanations
- Honest about your limitations
- Focused on providing accurate and useful information`;
    }

    generateFormattingInstructions() {
        return '## Tool Call Formatting Instructions\n\n' +
               'When calling tools, you must use a structured JSON format. Follow these formatting rules:\n\n' +
               '1. **Parameter Formatting:**\n' +
               '   - String and scalar parameters should be specified as-is (e.g., "https://example.com")\n' +
               '   - Lists and objects should use JSON format\n' +
               '   - Note that spaces for string values are not stripped\n' +
               '   - The output is parsed with regular expressions, so ensure valid JSON structure\n\n' +
               '2. **Tool Call Format:**\n' +
               '   Include a JSON object in your response using this exact format:\n' +
               '   ```json\n' +
               '   {{"action": "tool_call", "tool": "tool_name", "action_name": "action_name", "params": {{...}}}}\n' +
               '   ```\n' +
               '   Note: The "action_name" field specifies which action of the tool to execute. If a tool has only one action, you can omit the "action_name" field.\n\n' +
               '3. **Important Rules:**\n' +
               '   - When you need to use a tool, you MUST include the JSON tool call object in your response\n' +
               '   - The JSON object must be valid JSON and include all required parameters for the tool\n' +
               '   - You can include explanatory text before or after the JSON object\n' +
               '   - If you need to call multiple tools, include multiple JSON objects\n' +
               '   - After the tool executes, you will receive the results and can provide a final answer\n' +
               '   - The JSON tool call should be on its own line or clearly separated in a code block';
    }

    generateToolDefinitions() {
        if (!this.toolManager) {
            return '';
        }

        const actionSchemas = this.toolManager.registry.getAllActionSchemas();
        
        if (actionSchemas.length === 0) {
            return '';
        }

        let toolDefinitions = '\n## Tools\n\n';
        toolDefinitions += 'In this environment you have access to a set of tools you can use to answer the user\'s question.\n\n';
        toolDefinitions += 'Each tool can have multiple actions. Here are all available tool actions in JSON Schema format:\n\n';

        // Group actions by tool
        const toolsMap = new Map();
        actionSchemas.forEach(actionSchema => {
            const toolName = actionSchema.tool;
            if (!toolsMap.has(toolName)) {
                toolsMap.set(toolName, []);
            }
            toolsMap.get(toolName).push(actionSchema);
        });

        let actionIndex = 1;
        toolsMap.forEach((actions, toolName) => {
            toolDefinitions += `### Tool: ${toolName}\n\n`;
            
            actions.forEach(actionSchema => {
                const schema = {
                    tool: actionSchema.tool,
                    action: actionSchema.action,
                    description: actionSchema.description,
                    parameters: actionSchema.parameters
                };

                toolDefinitions += `#### Action ${actionIndex}: ${actionSchema.tool}.${actionSchema.action}\n`;
                toolDefinitions += `**Description:** ${actionSchema.description}\n\n`;
                toolDefinitions += '```json\n';
                toolDefinitions += JSON.stringify(schema, null, 2);
                toolDefinitions += '\n```\n\n';
                actionIndex++;
            });
        });

        return toolDefinitions;
    }

    generateToolExamples() {
        if (!this.toolManager) {
            return '';
        }

        const tools = this.toolManager.getAvailableTools();
        const webBrowseTool = tools.find(t => t.name === 'web_browse');
        
        if (!webBrowseTool) {
            return '';
        }

        return '\n## Example Tool Call\n\n' +
               'If a user asks "Browse https://example.com", you should respond with:\n\n' +
               'I\'ll browse that website for you.\n\n' +
               '```json\n' +
               '{{"action": "tool_call", "tool": "web_browse", "action_name": "browse", "params": {{"url": "https://example.com"}}}}\n' +
               '```\n\n' +
               'Note: For web_browse.browse action, you only need to provide the "url" parameter. The system will handle the browsing automatically.\n';
    }

    generateGuidelines() {
        return `\n## Important Guidelines

- Always be helpful and accurate
- When using tools, you MUST use the structured JSON format described above
- Explain what you're doing before calling tools when appropriate
- If a tool execution fails, explain the error and suggest alternatives
- Provide context and explanations, not just raw results
- Maintain conversation flow and remember previous context
- Use tools proactively when they would help answer the user's question more effectively`;
    }

    generateSystemPrompt() {
        let prompt = this.generatePersona();
        
        const toolDefinitions = this.generateToolDefinitions();
        if (toolDefinitions) {
            prompt += '\n' + this.generateFormattingInstructions();
            prompt += toolDefinitions;
            prompt += this.generateToolExamples();
        }

        prompt += this.generateGuidelines();

        return prompt.trim();
    }
}

export default SystemPromptGenerator;

