import fillTemplateString from "./utils/fillTemplateString";
import { Agent } from "./Agent";
import { Task } from "./Task";
import { Logger } from "./Logger";

import { performance } from "perf_hooks";
import crypto from "crypto";

export type ExtractPlaceholders<T extends string> =
  T extends `${infer _Start}{${infer Key}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never;

export type AgentPlaceholders<T extends Agent<any, any, any>> =
  ExtractPlaceholders<T["role"] | T["goal"] | T["background"]>;

// 5. Helper type to extract placeholders from a Task
export type TaskPlaceholders<T extends Task<any, any>> = ExtractPlaceholders<
  T["description"] | T["expectedOutput"]
>;

// 6. Helper type to extract placeholders from an array of Agents
export type AgentsPlaceholders<T extends Agent<any, any, any>[]> = {
  [K in keyof T]: AgentPlaceholders<T[K]>;
}[number];

// 7. Helper type to extract placeholders from an array of Tasks
export type TasksPlaceholders<T extends Task<any, any>[]> = {
  [K in keyof T]: TaskPlaceholders<T[K]>;
}[number];

// 8. Combine all placeholders
export type AllPlaceholders<
  TAgents extends Agent<any, any, any>[],
  TTasks extends Task<any, any>[]
> = AgentsPlaceholders<TAgents> | TasksPlaceholders<TTasks>;

// 9. Create mapped type for input based on all placeholders
export type PlaceholderInput<
  TAgents extends Agent<any, any, any>[],
  TTasks extends Task<any, any>[]
> = {
  [K in AllPlaceholders<TAgents, TTasks>]: string | number;
};

// Define a type alias for the placeholder keys
type PlaceholderKeys<
  TAgents extends Agent<any, any, any>[],
  TTasks extends Task<any, any>[]
> = AllPlaceholders<TAgents, TTasks>;

export class Workflow<
  TAgents extends Agent<any, any, any>[],
  TTasks extends Task<any, any>[]
> {
  /**
   * Unique identifier for the workflow instance.
   * This is generated using the `crypto.randomUUID()` method.
   *
   * @type {string}
   *
   * @example "wf-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
   *
   */
  readonly id: string;

  readonly tasks: TTasks;
  readonly agents: TAgents;

  inputTokens: number = 0;
  outputTokens: number = 0;

  startTime: number = 0;
  endTime: number = 0;
  totalTime: number = 0;

  readonly logger: Logger;

  constructor(workflowAttributes: { tasks: TTasks; agents: TAgents }) {
    this.tasks = workflowAttributes.tasks;
    this.agents = workflowAttributes.agents;
    this.logger = new Logger();

    const uuid = crypto.randomUUID();
    this.id = `wf-${uuid}`;
  }

  /**
   *  Initiate the workflow's activities.
   */
  async initiate(
    params: PlaceholderKeys<TAgents, TTasks> extends never
      ? {}
      : { input: PlaceholderInput<TAgents, TTasks> }
  ) {
    const input = (params as { input: PlaceholderInput<TAgents, TTasks> })
      .input;

    this.logger.info("Workflow initiated.");

    let taskIndex = 0;
    let outputContent = "";

    if (input) {
      this.logger.debug("Input provided:", input);

      this.agents.forEach((agent) => {
        agent.role = fillTemplateString(agent.role, input);
        agent.background = fillTemplateString(agent.background, input);
        agent.goal = fillTemplateString(agent.goal, input);
        this.logger.debug(`Agent updated:`, {
          role: agent.role,
          background: agent.background,
          goal: agent.goal,
        });
      });
      this.tasks.forEach((task) => {
        task.description = fillTemplateString(task.description, input);
        task.expectedOutput = fillTemplateString(task.expectedOutput, input);

        this.logger.debug(`Task updated:`, {
          description: task.description,
          expectedOutput: task.expectedOutput,
        });
      });
    }

    const workflowStartTime = performance.now();
    this.startTime = workflowStartTime;

    for (const task of this.tasks) {
      this.logger.info(
        `Agent ${task.agent.role} starting task: ${task.description}`
      );

      try {
        let output = await task.execute({
          logger: this.logger,
        });

        // Update the workflow's input and output tokens with
        // the task's input and output tokens for tracking purposes
        this.inputTokens += task.inputTokens;
        this.outputTokens += task.outputTokens;

        this.logger.debug(`Task completed`, task);
        const taskTotalTime = task.totalTime.toFixed(3);
        this.logger.info(`Task completed in ${taskTotalTime} ms`);

        if (taskIndex === this.tasks.length - 1) {
          const workflowEndTime = performance.now();

          this.endTime = workflowEndTime;
          this.totalTime = workflowEndTime - workflowStartTime;

          const totalTime = this.totalTime.toFixed(3);
          this.logger.info(
            `Workflow completed successfully in ${totalTime} ms.`,
            {
              inputTokens: this.inputTokens,
              outputTokens: this.outputTokens,
            }
          );
          this.logger.close();

          outputContent = output;

          return outputContent;
        }
      } catch (error) {
        this.logger.error(
          `Error in task ${task.description}: ${error}`,
          error instanceof Error ? error : undefined
        );
        this.logger.close();

        throw error;
      }

      taskIndex++;
    }

    const error = new Error("Workflow failed to complete");
    this.logger.error("Workflow failed to complete.", error);
    this.logger.close();
    throw error;
  }
}
