// Base class for large language model implementations

export abstract class LargeLanguageModel {
  /**
   * The name of the model implementation
   */
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Abstract method to generate a response from the model
   */
  abstract generateResponse(input: unknown): Promise<unknown>;

  /**
   * Abstract method to format the model output
   */
  abstract modelResponseFormatter(modelReponse: unknown): {
    contentOuput: string;
    inputTokens: number;
    outputTokens: number;
  };
}
