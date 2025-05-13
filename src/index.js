import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ChatService from './application/chatService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const chatService = new ChatService();

    try {
        // Read the data file
        const data = readFileSync(join(__dirname,  'data', 'topcompanies.txt'), 'utf8');
        chatService.chatHistory.addMessage("system", data);
        const response1 = await chatService.sendMessage("What are the top 100 companies in the world?");
        console.log("AI:", response1.content);

        // Get full chat history
        console.log("\nFull Chat History:");
        console.log(chatService.getChatHistory());
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        // Cleanup resources
        await chatService.cleanup();
    }
}

main();
