# Agenntic Framework for Agentic Workflows

## Overview

Agenntic is a versatile framework for building agentic workflows using TypeScript. It allows developers to create agents, tasks, and workflows to accomplish specific goals by leveraging Large Language Models (LLMs) such as OpenAI's GPT-4. The framework is designed to be type-safe, customizable, and easy to use, enabling the automation of complex workflows involving multiple agents and tasks.

## Features

- **Agents & Tasks**: Define agents with unique roles, goals, and personalities to execute tasks within workflows.
- **Workflow Management**: Create workflows consisting of multiple tasks assigned to agents, and manage their execution and interdependencies.
- **Type Safety**: TypeScript's powerful type system is used to provide type safety for roles, goals, tasks, and placeholders within workflows.
- **Modular Design**: The framework is easily extendable with custom LLM implementations. The default implementation uses OpenAI's models, but developers can integrate other models as needed.
- **Detailed Logging**: Every step of the execution is logged for better traceability and debugging.
- **Dynamic Data Handling**: Use variables in agent and task definitions to create flexible, reusable workflows.

## Why Use Agenntic? 🤔

I created Agenntic with several key motivations in mind:

- **Type-Safe Workflows** 🛡️: I wanted a type-safe way to create agentic workflows, ensuring that every aspect of the workflow is checked at compile time for errors, reducing runtime issues.
- **Simplicity and Minimalism** ✨: The goal was to build a framework that is simple, minimal, and easy to understand, making it accessible for developers of all levels.
- **Quick Setup** ⚡: I wanted a solution that allows you to have a running workflow in just a few minutes, minimizing the setup time and allowing developers to focus on building solutions.
- **Inspired by Crew AI** 🚀: Agenntic was inspired by the [Crew AI](https://crewai.com/) framework, aiming to bring similar capabilities to the TypeScript ecosystem, with the added benefit of strong type safety.

## Installation

Run the following command:

```bash
npm install @agenntic/agenntic
```

## Configuration

To use the default model (OpenAI's GPT-4), you need to set the environment variable OPENAI_API_KEY in a .env file. Create a .env file in the root of your project with the following content:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Replace your_openai_api_key_here with your actual OpenAI API key.

## Basic Usage

### Create an Agent

An agent is responsible for executing tasks. You can define an agent by specifying its role, goal, and background:

```typescript
import { Agent } from "@agenntic/agenntic";

const agent = new Agent({
  role: "Content Writer for {topic}",
  goal: "Write an engaging article about {topic}",
  background: "You are an expert in {topic} with years of experience.",
});
```

### Create a Task

Tasks are the basic units of a workflow. They represent specific pieces of work assigned to an agent.

```typescript
import { Task } from "@agenntic/agenntic";

const task = new Task({
  agent: agent,
  description: "Draft a {word-count}-word article on the topic of {topic}",
  expectedOutput: "An informative {word-count}-word article about {topic}.",
});
```

### Using the JSON Util for expectedOutput

When defining a task in your workflow, you can use the `JSON` function as the value of the `expectedOutput` field. This utility helps to ensure that the expected output is properly structured as a JSON object.

#### Example

Here is an example of how to use the `JSON` util in a task definition:

```typescript
import {
  JSON as AgennticJSON,
  Task,
  Workflow,
  Agent,
} from "@agenntic/agenntic";

const agent = new Agent({
  name: "Actionable Extractor",
  description:
    "You are an expert in analyzing transcripts and identifying actionable items.",
});

const expectedOutput = AgennticJSON(
  // An example of the JSON object.
  [
    {
      title: "Brief summary of the task",
      description:
        "Detailed explanation including any relevant context, deadlines, or specifics.",
    },
  ],
  // A description of the expected JSON object
  "An array containing actionable tasks. Each object should have a title and description field."
);

const transcript = "Your transcript...";
const task = new Task({
  agent: actionableExtractorAgent,
  description: "Analyze the transcript and extract actionable tasks.",
  expectedOutput: expectedOutput,
  context: transcript,
});

const workflow = new Workflow({
  tasks: [task],
  agents: [agent],
});

workflow
  .initiate({})
  .then((output) => {
    console.log("Workflow output:", output);
    console.log("JSON", JSON.parse(output));
  })
  .catch((error) => {
    console.error("Workflow execution failed:", error);
  });
```

### Create a Workflow

A workflow is a sequence of tasks executed by different agents. You can define dependencies between tasks to ensure proper order of execution.

```typescript
import { Workflow } from "@agenntic/agenntic";

const workflow = new Workflow({
  tasks: [task],
  agents: [agent],
});

const inputValues = { topic: "Quantum Computing", "word-count": 1000 };
workflow
  .initiate({ input: inputValues })
  .then((output) => {
    console.log("Workflow output:", output);
  })
  .catch((error) => {
    console.error("Workflow execution failed:", error);
  });
```

## Using Variables in Workflows

Agenntic allows you to create dynamic workflows by using variables in agent and task definitions. You can set variables by wrapping the variable name in curly braces `{}` in the following fields:

- Agent: `role`, `goal`, `background`
- Task: `description`, `expectedOutput`

This feature enables you to create flexible, reusable workflows that can adapt to different inputs.

### Best Practices for Variables

- Use lowercase letters and hyphens for variable names (e.g., `{my-variable}`)
- Choose descriptive names that clearly indicate the variable's purpose
- Be consistent with naming conventions across your workflow
- Avoid using spaces or special characters in variable names

Example of good variable usage:

```typescript
import { Agent, Task, Workflow } from "@agenntic/agenntic";

// Define the agent
const agent = new Agent({
  role: "Financial Analyst for {company-name}",
  goal: "Analyze {financial-report-type} for {fiscal-year}",
  background: "You are an expert in {industry} financial analysis.",
});

// Define the task
const task = new Task({
  agent: agent,
  description:
    "Review {financial-report-type} and prepare a {report-length} summary",
  expectedOutput:
    "A comprehensive {report-length} summary of {company-name}'s {financial-report-type} for {fiscal-year}.",
});

// Create the workflow
const workflow = new Workflow({
  tasks: [task],
  agents: [agent],
});

// Define the input values
const inputValues = {
  "company-name": "TechCorp",
  "financial-report-type": "annual report",
  "fiscal-year": "2023",
  industry: "technology",
  "report-length": "5-page",
};

// Initiate the workflow
workflow
  .initiate({ input: inputValues })
  .then((output) => {
    console.log("Workflow output:", output);
  })
  .catch((error) => {
    console.error("Workflow execution failed:", error);
  });
```

By following these practices, you can create clear, maintainable, and reusable workflows that can easily adapt to different scenarios and inputs.

### Customizing the LLM

By default, the `Agent` uses OpenAI's GPT-4 model, but you can provide a custom implementation:

```typescript
import { LargeLanguageModel } from "@agenntic/agenntic";

class CustomModel extends LargeLanguageModel {
  async generateResponse(input: string) {
    return {
      choices: [
        { message: { content: `Custom model response for input: ${input}` } },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 50 },
    };
  }
}

const customAgent = new Agent({
  role: "Custom Agent",
  goal: "Demonstrate custom model usage",
  background: "Uses a custom language model.",
  llmModel: new CustomModel(),
});
```

## Logging

The framework includes a logger that records every step of the workflow execution. Logs are saved in the `logs` folder by default. You can customize the log folder and file name by providing options to the `Logger` class.

## Testing

The framework comes with a set of unit tests to verify its functionality. To run the tests, execute:

```bash
npm run test
```

The tests cover various scenarios, including task retries, workflows with dependencies, and custom LLM integrations.

## Example Workflows

### Single-Agent, Single-Task Workflow

This is the simplest workflow scenario, where a single agent is responsible for executing a single task.

```typescript
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

workflow
  .initiate({ input: { topic: "Artificial Intelligence" } })
  .then((output) => {
    console.log("Workflow output:", output);
  });
```

### Multiple Agents, Sequential Tasks

In this example, multiple agents collaborate on a sequence of tasks. One agent researches the topic, and another agent writes an article based on the research.

```typescript
const researcher = new Agent({
  role: "Researcher",
  goal: "Gather information about {topic}",
  background: "You are skilled at conducting thorough research.",
});

const writer = new Agent({
  role: "Content Writer",
  goal: "Write an article based on research findings",
  background: "You are an expert in writing engaging content.",
});

const researchTask = new Task({
  agent: researcher,
  description: "Research the topic {topic}",
  expectedOutput: "A comprehensive summary of information about {topic}.",
});

const writingTask = new Task({
  agent: writer,
  description: "Draft an article based on the research about {topic}",
  expectedOutput: "An engaging article about {topic}.",
  dependencyTasks: [researchTask],
});

const workflow = new Workflow({
  tasks: [researchTask, writingTask],
  agents: [researcher, writer],
});

workflow.initiate({ input: { topic: "Climate Change" } }).then((output) => {
  console.log("Workflow output:", output);
});
```

### Parallel Tasks with Shared Context

In this example, multiple tasks are executed in parallel, and their results are used in a final summary task. Each agent is responsible for a different aspect of the topic.

```typescript
const agent1 = new Agent({
  role: "Data Collector",
  goal: "Collect data on {topic}",
  background: "You are an expert in data collection.",
});

const agent2 = new Agent({
  role: "Expert Analyst",
  goal: "Analyze collected data on {topic}",
  background: "You specialize in data analysis.",
});

const dataCollectionTask = new Task({
  agent: agent1,
  description: "Collect relevant data about {topic}",
  expectedOutput: "A detailed dataset about {topic}.",
});

const analysisTask = new Task({
  agent: agent2,
  description: "Analyze the collected data on {topic}",
  expectedOutput: "A detailed analysis of the data on {topic}.",
});

const summaryAgent = new Agent({
  role: "Summarizer",
  goal: "Summarize the findings on {topic}",
  background: "You are skilled in summarizing complex information.",
});

const summaryTask = new Task({
  agent: summaryAgent,
  description: "Summarize the data and analysis on {topic}",
  expectedOutput: "A concise summary of the findings on {topic}.",
  dependencyTasks: [dataCollectionTask, analysisTask],
});

const workflow = new Workflow({
  tasks: [dataCollectionTask, analysisTask, summaryTask],
  agents: [agent1, agent2, summaryAgent],
});

workflow.initiate({ input: { topic: "Renewable Energy" } }).then((output) => {
  console.log("Workflow output:", output);
});
```

### Error Handling with Retries

In this workflow, an agent may fail to complete a task, and the framework will retry the task up to three times before giving up.

```typescript
const faultyAgent = new Agent({
  role: "Faulty Agent",
  goal: "Attempt to execute a task that might fail",
  background: "This agent is designed to potentially fail.",
});

const riskyTask = new Task({
  agent: faultyAgent,
  description: "Perform a risky operation",
  expectedOutput: "A successful execution of the risky operation.",
});

const workflow = new Workflow({
  tasks: [riskyTask],
  agents: [faultyAgent],
});

workflow.initiate({}).catch((error) => {
  console.error("Workflow execution failed after retries:", error);
});
```

### Mixed Task Types with Custom Models

This example demonstrates using a custom model to execute tasks in a workflow. One agent uses OpenAI's model, while the other uses a custom language model.

```typescript
const openAIAgent = new Agent({
  role: "Content Generator",
  goal: "Generate content using OpenAI",
  background: "You use OpenAI's GPT-4 to generate content.",
});

const customModel = new CustomModel({
  apiKey: "your-api-key",
  model: "custom-model",
});

const customAgent = new Agent({
  role: "Custom Content Generator",
  goal: "Generate content using a custom model",
  background: "You use a custom model to generate content.",
  llmModel: customModel,
});

const task1 = new Task({
  agent: openAIAgent,
  description: "Create an introduction about {topic}",
  expectedOutput: "A well-written introduction about {topic}.",
});

const task2 = new Task({
  agent: customAgent,
  description: "Write a conclusion using custom model for {topic}",
  expectedOutput: "A thoughtful conclusion about {topic}.",
});

const workflow = new Workflow({
  tasks: [task1, task2],
  agents: [openAIAgent, customAgent],
});

workflow
  .initiate({ input: { topic: "Blockchain Technology" } })
  .then((output) => {
    console.log("Workflow output:", output);
  });
```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! If you encounter issues or have suggestions for improvements, please create an issue or submit a pull request.

## Contact

For questions or further details, feel free to reach out to us through GitHub.
