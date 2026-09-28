export function createUnavailableLlmService() {
  return {
    async generateSummary() {
      throw new Error('LLM provider is not configured');
    },
  };
}
