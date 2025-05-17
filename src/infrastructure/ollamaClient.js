import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

class OllamaClient {
    constructor(baseUrl = "http://localhost:11434", model = "openchat:latest", streaming = true) {
        this.model = new ChatOllama({
            baseUrl,
            model,
            streaming: streaming,
        });

        this.chatPrompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant respond with valid json."],
            new MessagesPlaceholder("chat_history"),
            ["human", "{input}"],
        ]);

        this.chain = RunnableSequence.from([
            this.chatPrompt,
            this.model,
        ]);
    }

    formatMessages(chatHistory) {
        return chatHistory.map(msg => {
            switch (msg.role) {
                case 'human':
                    return new HumanMessage(msg.content);
                case 'ai':
                    return new AIMessage(msg.content);
                case 'system':
                    return new SystemMessage(msg.content);
                default:
                    return new HumanMessage(msg.content);
            }
        });
    }

    async sendMessage(chatHistory, input) {
        try {
            const formattedHistory = this.formatMessages(chatHistory);
            const response = await this.chain.invoke({
                chat_history: formattedHistory,
                input,
            });
            return response;
        } catch (error) {
            throw new Error(`Failed to send message to Ollama: ${error.message}`);
        }
    }

    async sendMessageSSE(chatHistory, input) {
        try {
            const formattedHistory = this.formatMessages(chatHistory);
            return  await this.chain.stream({
                chat_history: formattedHistory,
                input,
            });
        } catch (error) {
            throw new Error(`Failed to send message to Ollama: ${error.message}`);
        }
    }
}

export default OllamaClient; 