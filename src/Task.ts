import { Logger } from "./Logger";
import { Agent } from "./Agent";
import { performance } from "perf_hooks";
import crypto from "crypto";

interface TaskAttributes<TDescription = string, TExpectedOutput = string> {
  /** A clear, concise statement of what the task entails. */
  description: TDescription;
  /** The agent responsible for the task, assigned either directly or by the crew's process. */
  agent: Agent;
  /** A detailed description of what the task's completion looks like. */
  expectedOutput: TExpectedOutput;
  /** Specifies tasks that this task depends on for its execution, providing necessary context. */
  dependencyTasks?: Task[];
}

const DEFAULT_RETRIES = 3;

export class Task<
  TDescription extends string = string,
  TExpectedOutput extends string = string
> implements TaskAttributes<TDescription, TExpectedOutput>
{
  /**
   * The unique identifier of the task.
   * This is generated using the `crypto.randomUUID()` method.
   *
   * @type {string}
   *
   * @example "tsk-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
   */
  readonly id: string;

  description: TDescription;
  expectedOutput: TExpectedOutput;
  readonly agent: Agent;
  readonly dependencyTasks?: Task[];
  /**
   * The output of the task, which can be used as context for subsequent tasks.
   */
  output?: string;
  /**
   * The context that will be used in the prompt for the task.
   */
  context: string = "";

  inputTokens: number = 0;
  outputTokens: number = 0;

  startTime: number = 0;
  endTime: number = 0;
  totalTime: number = 0;

  retryCount: number = 0;

  constructor(taskAttributes: TaskAttributes<TDescription, TExpectedOutput>) {
    this.description = taskAttributes.description;
    this.agent = taskAttributes.agent;
    this.expectedOutput = taskAttributes.expectedOutput;
    this.dependencyTasks = taskAttributes.dependencyTasks;

    const uuid = crypto.randomUUID();
    this.id = `tsk-${uuid}`;
  }

  async execute(executionContext: { logger: Logger }): Promise<string> {
    const { logger } = executionContext;

    if (this.dependencyTasks) {
      this.context = this.dependencyTasks
        .map((task) => task.output)
        .filter(Boolean)
        .join("\n");
    }

    for (let attempt = 0; attempt < DEFAULT_RETRIES; attempt++) {
      try {
        this.retryCount = attempt;

        logger.info(`Task execution attempt`, {
          taskId: this.id,
          execution: {
            attempt: attempt + 1,
            maxAttempts: DEFAULT_RETRIES,
            description: this.description,
            agentId: this.agent.id,
            agentRole: this.agent.role,
          },
        });

        const startTime = performance.now();

        const result = await this._executeTask({
          agent: this.agent,
          context: this.context,
          logger,
        });

        const endTime = performance.now();

        this.startTime = startTime;
        this.endTime = endTime;
        this.totalTime = endTime - startTime;

        logger.info(`Task completed successfully`, {
          taskId: this.id,
          performance: {
            durationMs: this.totalTime,
            attemptsUsed: attempt + 1,
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens,
          },
          result: {
            output: result,
          },
        });

        return result;
      } catch (error) {
        logger.error(`Task execution failed`, undefined, {
          taskId: this.id,
          execution: {
            attempt: attempt + 1,
            maxAttempts: DEFAULT_RETRIES,
            remainingAttempts: DEFAULT_RETRIES - (attempt + 1),
          },
          errorDetails: {
            name: error instanceof Error ? error.name : "Unknown",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        });

        if (attempt < DEFAULT_RETRIES - 1) {
          logger.warn(`Retrying failed task`, {
            taskId: this.id,
            retry: {
              attempt: attempt + 1,
              nextAttempt: attempt + 2,
              maxAttempts: DEFAULT_RETRIES,
            },
          });
        } else {
          throw new Error(
            `Task failed after ${DEFAULT_RETRIES} attempts: ${error}`
          );
        }
      }
    }

    // Should never reach here
    throw new Error("Unexpected error in execute method");
  }

  async _executeTask({
    agent,
    context,
    logger,
  }: {
    agent: Agent;
    context: string;
    logger: Logger;
  }) {
    const result = await agent.executeTask({
      task: this,
      context,
      logger,
    });

    this.output = result;
    return result;
  }

  prompt() {
    const expectedOutput = this.getExpectedOutputPromptPart();
    return `${this.description}\n${expectedOutput}`;
  }

  getExpectedOutputPromptPart() {
    return `Your final response must follow the following guidelines: ${this.expectedOutput}. Your answer must include the full content without summarizing.`;
  }

  toJSON() {
    return {
      id: this.id,
      agent: this.agent,
      context: this.context,
      description: this.description,
      startTime: this.startTime,
      endTime: this.endTime,
      totalTime: this.totalTime,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      output: this.output,
      prompt: this.prompt(),
    };
  }
}
