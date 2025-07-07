// Utility to get OpenAI token count using tiktoken
import { encoding_for_model } from "@dqbd/tiktoken";

export async function countOpenAITokens(text, model = "gpt-4.1-mini") {
    // tiktoken is async for WASM init
    const enc = await encoding_for_model(model);
    const tokens = enc.encode(text);
    const count = tokens.length;
    enc.free();
    return count;
}
