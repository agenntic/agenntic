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

    this.logger.info(`Workflow initiated`, {
      workflowId: this.id,
      configuration: {
        agentCount: this.agents.length,
        taskCount: this.tasks.length,
        input,
      },
    });

    let taskIndex = 0;
    let outputContent = "";

    if (input) {
      this.agents.forEach((agent) => {
        const originalState = {
          role: agent.role,
          background: agent.background,
          goal: agent.goal,
        };

        agent.role = fillTemplateString(agent.role, input);
        agent.background = fillTemplateString(agent.background, input);
        agent.goal = fillTemplateString(agent.goal, input);

        this.logger.debug(`Agent template parameters processed`, {
          workflowId: this.id,
          agentId: agent.id,
          updates: {
            role: {
              from: originalState.role,
              to: agent.role,
            },
            background: {
              from: originalState.background,
              to: agent.background,
            },
            goal: {
              from: originalState.goal,
              to: agent.goal,
            },
          },
        });
      });
      this.tasks.forEach((task) => {
        const originalState = {
          description: task.description,
          expectedOutput: task.expectedOutput,
        };

        task.description = fillTemplateString(task.description, input);
        task.expectedOutput = fillTemplateString(task.expectedOutput, input);

        this.logger.debug(`Task template parameters processed`, {
          workflowId: this.id,
          taskId: task.id,
          updates: {
            description: {
              from: originalState.description,
              to: task.description,
            },
            expectedOutput: {
              from: originalState.expectedOutput,
              to: task.expectedOutput,
            },
          },
        });
      });
    }

    const workflowStartTime = performance.now();
    this.startTime = workflowStartTime;

    for (const task of this.tasks) {
      this.logger.info(`Task execution started`, {
        workflowId: this.id,
        executionProgress: {
          currentTaskIndex: taskIndex + 1,
          totalTasks: this.tasks.length,
          progressPercentage: (
            ((taskIndex + 1) / this.tasks.length) *
            100
          ).toFixed(1),
        },
        taskDetails: {
          id: task.id,
          description: task.description,
          agent: {
            id: task.agent.id,
            role: task.agent.role,
          },
        },
      });

      try {
        let output = await task.execute({
          logger: this.logger,
        });

        // Update the workflow's input and output tokens with
        // the task's input and output tokens for tracking purposes
        this.inputTokens += task.inputTokens;
        this.outputTokens += task.outputTokens;

        if (taskIndex === this.tasks.length - 1) {
          const workflowEndTime = performance.now();

          this.endTime = workflowEndTime;
          this.totalTime = workflowEndTime - workflowStartTime;

          this.logger.info(`Workflow completed successfully`, {
            workflowId: this.id,
            finalMetrics: {
              totalDurationMs: this.totalTime,
              totalInputTokens: this.inputTokens,
              totalOutputTokens: this.outputTokens,
              totalTokens: this.inputTokens + this.outputTokens,
              averageTokensPerTask: Math.round(
                (this.inputTokens + this.outputTokens) / this.tasks.length
              ),
              averageDurationPerTask: Math.round(
                this.totalTime / this.tasks.length
              ),
            },
            output: output,
          });

          this.logger.close();

          outputContent = output;

          return outputContent;
        }
      } catch (error) {
        this.logger.error(`Workflow failed`, undefined, {
          workflowId: this.id,
          failurePoint: {
            taskIndex: taskIndex,
            taskId: task.id,
            progressPercentage: ((taskIndex / this.tasks.length) * 100).toFixed(
              1
            ),
          },
          errorDdetails: {
            name: error instanceof Error ? error.name : "Unknown",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          metricsAtFailure: {
            durationMs: performance.now() - workflowStartTime,
            totalInputTokens: this.inputTokens,
            totalOutputTokens: this.outputTokens,
            completedTasks: taskIndex,
            remainingTasks: this.tasks.length - taskIndex,
          },
        });

        this.logger.close();

        throw error;
      }

      taskIndex++;
    }

    const error = new Error("Workflow failed to complete");

    this.logger.error(`Workflow failed unexpectedly`, undefined, {
      workflowId: this.id,
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      metricsAtFailure: {
        durationMs: performance.now() - workflowStartTime,
        totalInputTokens: this.inputTokens,
        totalOutputTokens: this.outputTokens,
        completedTasks: taskIndex,
        remainingTasks: this.tasks.length - taskIndex,
      },
    });

    this.logger.close();
    throw error;
  }
}
