class ChatHistory {
    constructor() {
        this.messages = [];
    }

    addMessage(role, content) {
        this.messages.push({ role, content });
        return this.messages;
    }

    getMessages() {
        return this.messages;
    }

    clearHistory() {
        this.messages = [];
        return this.messages;
    }

    getLastMessage() {
        return this.messages[this.messages.length - 1];
    }
}

export default ChatHistory; 