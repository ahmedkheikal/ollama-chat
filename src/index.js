import ChatService from './application/chatService.js';

async function main() {
    const chatService = new ChatService();

    try {
        // Example of web browsing
        const response1 = await chatService.sendMessage("browse https://docs.daftra.com/ and tell me how to manage invetories in daftra");
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
