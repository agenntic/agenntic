// Mock the OpenAIModel to avoid making actual API calls during testing
jest.mock("@agenntic/Models/OpenAIModel", () => {
  return {
    __esModule: true,
    default: class {
      async generateResponse(input: string) {
        // Mocked response based on the input prompt
        return {
          choices: [
            {
              message: {
                content: `Mocked response for input: ${input}`,
              },
            },
          ],
          usage: {
            // Mocked token usage for the response
            // At least 1 token is used for each prompt and completion
            prompt_tokens: Math.floor(Math.random() * 100) + 1,
            completion_tokens: Math.floor(Math.random() * 100) + 1,
          },
        };
      }
      modelResponseFormatter(output: any) {
        const content = output.choices[0].message.content;
        return {
          contentOuput: content,
          inputTokens: output.usage.prompt_tokens,
          outputTokens: output.usage.completion_tokens,
        };
      }
    },
  };
});

import { LargeLanguageModel } from "@agenntic/Models/LargeLanguageModel";
import { Agent, Task, Workflow } from "@agenntic/index";

describe("Agenntic workflows library test suit", () => {
  test("Single agent, single task", async () => {
    const agent = new Agent({
      role: "Content Writer",
      goal: "Write an article about {topic}",
      background: "You are an expert in writing engaging content.",
    });

    const task = new Task({
      agent: agent,
      description: "Draft an article on the topic of {topic}",
      expectedOutput: "An informative article about {topic}.",
    });

    const workflow = new Workflow({
      tasks: [task],
      agents: [agent],
    });

    const inputValues = {
      topic: "Quantum Computing",
    };

    const output = await workflow.initiate({ input: inputValues });

    expect(output).toBeDefined();
    expect(output).toContain("Mocked response for input");

    expect(task.output).toBeDefined();
    expect(task.output).toContain("Mocked response for input");

    expect(task.startTime).toBeGreaterThan(0);
    expect(task.endTime).toBeGreaterThan(0);
    expect(task.totalTime).toBeGreaterThan(0);

    expect(task.inputTokens).toBeGreaterThan(0);
    expect(task.outputTokens).toBeGreaterThan(0);

    expect(workflow.totalTime).toBeGreaterThan(0);
    expect(workflow.startTime).toBeGreaterThan(0);
    expect(workflow.endTime).toBeGreaterThan(0);

    expect(workflow.inputTokens).toBeGreaterThan(0);
    expect(workflow.outputTokens).toBeGreaterThan(0);
  });

  test("Multiple agents, multiple tasks with dependencies", async () => {
    const agent1 = new Agent({
      role: "Researcher",
      goal: "Gather information about {topic}",
      background: "You are skilled at conducting thorough research.",
    });

    const agent2 = new Agent({
      role: "Analyst",
      goal: "Analyze the research findings on {topic}",
      background: "You specialize in data analysis and insights.",
    });

    const task1 = new Task({
      agent: agent1,
      description: "Research the topic {topic}",
      expectedOutput: "A comprehensive summary of information about {topic}.",
    });

    const task2 = new Task({
      agent: agent2,
      description: "Analyze the research findings on {topic}",
      expectedOutput: "An analytical report on {topic}.",
      dependencyTasks: [task1],
    });

    const workflow = new Workflow({
      tasks: [task1, task2],
      agents: [agent1, agent2],
    });

    const inputValues = {
      topic: "Climate Change",
    };

    const output = await workflow.initiate({ input: inputValues });

    expect(output).toBeDefined();
    expect(output).toContain("Mocked response for input");

    expect(task1.output).toBeDefined();
    expect(task1.output).toContain("Mocked response for input");
    expect(task2.output).toBeDefined();
    expect(task2.output).toContain("Mocked response for input");

    expect(workflow.totalTime).toBeGreaterThan(0);
  });

  test("Task with failing execution that triggers retries", async () => {
    const failingAgent = new Agent({
      role: "Faulty Agent",
      goal: "Fail to execute the task",
      background: "This agent is designed to fail.",
    });

    // Mock the agent's executeTask method to throw an error
    jest.spyOn(failingAgent, "executeTask").mockImplementation(async () => {
      throw new Error("Simulated task failure");
    });

    const task = new Task({
      agent: failingAgent,
      description: "This task will fail",
      expectedOutput: "No output expected",
    });

    const workflow = new Workflow({
      tasks: [task],
      agents: [failingAgent],
    });

    await expect(workflow.initiate({})).rejects.toThrow(
      "Simulated task failure"
    );

    // Assuming retries are set to 2
    expect(task["retryCount"]).toBe(2);
  });

  test("Workflow with no tasks", async () => {
    const agent = new Agent({
      role: "Content Writer",
      goal: "Write an article about {topic}",
      background: "You are an expert in writing engaging content.",
    });

    const workflow = new Workflow({
      tasks: [],
      agents: [agent],
    });

    await expect(
      workflow.initiate({ input: { topic: "Artificial Intelligence" } })
    ).rejects.toThrow("Workflow failed to complete");
  });

  test("Agent with custom model", async () => {
    // Create a custom model that extends LargeLanguageModel
    class CustomModel extends LargeLanguageModel {
      apiKey: string;
      model: string;
      constructor(modelAttributes: { apiKey: string; model: string }) {
        super("CustomModel");

        this.apiKey = modelAttributes.apiKey;
        this.model = modelAttributes.model;
      }

      async generateResponse(input: string) {
        return {
          choices: [
            {
              message: {
                content: `Custom model response for input: ${input}`,
              },
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 50,
          },
        };
      }

      modelResponseFormatter(modelReponse: unknown): {
        contentOuput: string;
        inputTokens: number;
        outputTokens: number;
      } {
        const content = (modelReponse as any).choices[0].message.content;
        return {
          contentOuput: content,
          inputTokens: (modelReponse as any).usage.prompt_tokens,
          outputTokens: (modelReponse as any).usage.completion_tokens,
        };
      }
    }

    const customModel = new CustomModel({
      apiKey: "test-api-key",
      model: "custom-model",
    });

    const agent = new Agent({
      role: "Custom Agent",
      goal: "Demonstrate custom model usage",
      background: "Uses a custom language model.",
      llmModel: customModel,
    });

    const task = new Task({
      agent: agent,
      description: "Perform a task using a custom model",
      expectedOutput: "An output generated by the custom model.",
    });

    const workflow = new Workflow({
      tasks: [task],
      agents: [agent],
    });

    const output = await workflow.initiate({});

    expect(output).toContain("Custom model response for input");
  });
});
