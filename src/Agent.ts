import crypto from "crypto";

import fillTemplateString from "./utils/fillTemplateString";
import { Task } from "./Task";
import { Logger } from "./Logger";
import { LargeLanguageModel } from "./Models/LargeLanguageModel";
import OpenAIModel from "./Models/OpenAIModel";

interface AgentAttributes<
  TRole extends string,
  TGoal extends string,
  TBackground extends string
> {
  /** The role the agent should play in the task.
   *
   *  @example "Content writer"
   */
  role: TRole;
  /** What the agent should aim to achieve in the task.
   *
   * @example "Write a blog post about the benefits of SEO"
   *
   */
  goal: TGoal;
  /**
   *  Additional details about the agent
   *  @example "You work for a digital marketing agency called 'SEO Wizards'."
   */
  background: TBackground;
}

export class Agent<
  TRole extends string = string,
  TGoal extends string = string,
  TBackground extends string = string
> implements AgentAttributes<TRole, TGoal, TBackground>
{
  /**
   * The unique identifier of the agent.
   * This is generated using the `crypto.randomUUID()` method.
   *
   * @type {string}
   *
   * @example "ag-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
   */
  readonly id: string;
  role: TRole;
  goal: TGoal;
  background: TBackground;
  state: "idle" | "busy" | "error" = "idle";
  readonly llmModel: LargeLanguageModel;
  constructor(
    agentAttributes: AgentAttributes<TRole, TGoal, TBackground> & {
      /**
       *  Implementation of the agent's model.
       *
       *  By default, the agent uses OpenAI's GPT-4-o model
       */
      llmModel?: LargeLanguageModel;
    }
  ) {
    this.role = agentAttributes.role;
    this.goal = agentAttributes.goal;
    this.background = agentAttributes.background;
    this.llmModel = agentAttributes.llmModel || this.getDefaultModel();

    this.id = "ag-" + crypto.randomUUID();
  }

  getDefaultModel() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required to use the default model"
      );
    }
    const model = new OpenAIModel({
      model: "gpt-4o",
      apiKey: process.env.OPENAI_API_KEY,
    });
    return model;
  }

  async executeTask({
    task,
    context,
    logger,
  }: {
    task: Task;
    context?: string;
    logger: Logger;
  }): Promise<string> {
    try {
      this.state = "busy";
      const taskPrompt = this.getTaskPrompt({ task, context });

      logger.debug(`Agent executing task`, {
        agentDetails: {
          id: this.id,
          role: this.role,
          background: this.background,
          goal: this.goal,
          model: {
            name: this.llmModel.name,
          },
        },
        taskDetails: {
          id: task.id,
          description: task.description,
          dependencies: task.dependencyTasks?.map((t) => t.id),
          extpectedOutput: task.expectedOutput,
        },
      });

      const modelResponse = await this.llmModel.generateResponse(taskPrompt);

      const response = this.llmModel.modelResponseFormatter(modelResponse);
      // Update the task with the input and output tokens
      // from the model response for tracking purposes
      task.inputTokens = response.inputTokens;
      task.outputTokens = response.outputTokens;

      logger.info(`Task execution completed`, {
        agentId: this.id,
        taskId: task.id,
        taskOutput: response.contentOuput,
        performance: {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.inputTokens + response.outputTokens,
          processingTime: task.totalTime,
        },
      });

      this.state = "idle";
      return response.contentOuput;
    } catch (error) {
      this.state = "error";

      logger.error(`Task execution failed`, undefined, {
        agentId: this.id,
        taskId: task.id,
        errorDetails: {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      throw error;
    }
  }

  getTaskPrompt({ task, context }: { task: Task; context?: string }) {
    let agentPersonality = this.getAgentPersonality();

    let taskContext = context
      ? this.getTaskPromptWithContext(task, context)
      : task.prompt();

    return `${agentPersonality}\n${taskContext}`;
  }

  getTaskPromptWithContext(task: Task, context: string) {
    const taskContextTemplate =
      "{taskPrompt}\n\nThis is the context you're working with:\n{context}";

    return fillTemplateString(taskContextTemplate, {
      taskPrompt: task.prompt(),
      context,
    });
  }

  getAgentPersonality() {
    const personalityTemplate =
      "You are a {role}. {background}.\nYour goal is: {goal}.";
    return fillTemplateString(personalityTemplate, {
      role: this.role,
      goal: this.goal,
      background: this.background || "",
    });
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      background: this.background,
      goal: this.goal,
      llmModelName: this.llmModel.name,
      personality: this.getAgentPersonality(),
    };
  }
}
