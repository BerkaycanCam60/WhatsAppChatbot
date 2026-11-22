const conversations = new Map();

function getConversation(customerId) {
    if (!conversations.has(customerId)) {
        conversations.set(customerId, {
            lastIntent: null,
            selectedQuantity: null,
            selectedProduct: null,
            humanSupportRequested: false,
            botPaused: false
            
        });
    }

    return conversations.get(customerId);
}

function updateConversation(customerId, updates) {
    const currentConversation = getConversation(customerId);

    const updatedConversation = {
        ...currentConversation,
        ...updates
    };

    conversations.set(customerId, updatedConversation);

    return updatedConversation;
}

function pauseBot(customerId) {
    return updateConversation(customerId, {
        lastIntent: "HUMAN_SUPPORT",
        humanSupportRequested: true,
        botPaused: true
    });
}

function resumeBot(customerId) {
    return updateConversation(customerId, {
        humanSupportRequested: false,
        botPaused: false
    });
}

function clearConversation(customerId) {
    conversations.delete(customerId);
}

module.exports = {
    getConversation,
    updateConversation,
    pauseBot,
    resumeBot,
    clearConversation
};