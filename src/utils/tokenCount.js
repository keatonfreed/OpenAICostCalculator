// Utility to get OpenAI token count using tiktoken
import { get_encoding } from "@dqbd/tiktoken";

const enc = get_encoding("o200k_base");

export function countOpenAITokens(text) {
    const tokens = enc.encode(text);
    return tokens.length;
}