import { LargeLanguageModel } from "./LargeLanguageModel";

import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/index";

/**
 * Open AI Model implementation
 *
 * By default, the implementation uses OpenAI's GPT-4o model
 */
class OpenAIModel extends LargeLanguageModel {
  model: ChatCompletionCreateParamsNonStreaming["model"];
  OpenAIInstance: OpenAI;

  constructor({
    model = "gpt-4o",
    apiKey,
  }: {
    model?: ChatCompletionCreateParamsNonStreaming["model"];
    apiKey: string;
  }) {
    super("OpenAI");
    this.model = model;
    this.OpenAIInstance = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateResponse(input: string): Promise<ChatCompletion> {
    try {
      const response = await this.OpenAIInstance.chat.completions.create({
        messages: [
          {
            role: "system",
            content: input,
          },
        ],
        model: this.model,
      });
      response.usage?.prompt_tokens;
      return response;
    } catch (error) {
      console.error("Error generating response from OpenAI:", error);
      throw error;
    }
  }

  modelResponseFormatter(output: ChatCompletion): {
    contentOuput: string;
    inputTokens: number;
    outputTokens: number;
  } {
    const content = output.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("No content in the response.");
      return {
        contentOuput: "",
        inputTokens: output.usage?.prompt_tokens || 0,
        outputTokens: output.usage?.completion_tokens || 0,
      };
    }

    return {
      contentOuput: content,
      inputTokens: output.usage?.prompt_tokens || 0,
      outputTokens: output.usage?.completion_tokens || 0,
    };
  }
}

export default OpenAIModel;
