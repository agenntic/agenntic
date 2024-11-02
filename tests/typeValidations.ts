import { AssertTrue } from "conditional-type-checks";
import {
  ExtractPlaceholders,
  AgentPlaceholders,
  AgentsPlaceholders,
  AllPlaceholders,
  PlaceholderInput,
  TaskPlaceholders,
  TasksPlaceholders,
  Workflow,
} from "../src/Workflow";
import { Agent, Task } from "../src";

// Helper type to check for exact type equality
type ExactlyExtends<T, U> = (<V>() => V extends T ? 1 : 2) extends <
  V
>() => V extends U ? 1 : 2
  ? [T] extends [U]
    ? [U] extends [T]
      ? true
      : false
    : false
  : false;

// 1. Validate ExtractPlaceholders

// Validate with a string that has placeholders
type PlaceholdersString = ExtractPlaceholders<"Hello {world} This is a {test}">;
type TestExtractPlaceholders1 = AssertTrue<
  ExactlyExtends<PlaceholdersString, "world" | "test">
>;

// Validate with a string that has no placeholders
type PlaceholdersString2 = ExtractPlaceholders<"No placeholders here!">;
type TestExtractPlaceholders2 = AssertTrue<
  ExactlyExtends<PlaceholdersString2, never>
>;

// 2. Validate AgentPlaceholders

const grammarChecker = new Agent({
  role: "Grammar Checker",
  goal: "Correct the grammar of the following text: {text}",
  background:
    "You are a grammar checker agent that corrects the grammar of the text without changing the meaning of the text. This is a list of specialized words related to the company: {custom-dictionary}",
});

const meetingSummarizer = new Agent({
  role: "{text-type} Summarizer",
  goal: "Summarize the text of a {text-type}",
  background:
    "You're an expert in summarizing {text-type} content in a clear and concise way to create minutes of the meetings. You work at {company-description}. Additionally, you note down {important-items}",
});

type AgentPlaceholders1 = AgentPlaceholders<typeof grammarChecker>;
type TestAgentPlaceholders1 = AssertTrue<
  ExactlyExtends<AgentPlaceholders1, "text" | "custom-dictionary">
>;

type AgentPlaceholders2 = AgentPlaceholders<typeof meetingSummarizer>;
type TestAgentPlaceholders2 = AssertTrue<
  ExactlyExtends<
    AgentPlaceholders2,
    "text-type" | "company-description" | "important-items"
  >
>;

// 3. Validate TaskPlaceholders

const grammarCheckTask = new Task({
  agent: grammarChecker,
  description: "Check the grammar of the following text: {text}",
  expectedOutput: "The text with corrected grammar",
});

const summarizeTask = new Task({
  agent: meetingSummarizer,
  description: "Summarize the transcribed text of the {text-type}",
  expectedOutput:
    "A minute of the meeting in markdown format in {language} language",
  dependencyTasks: [grammarCheckTask],
});

type TaskPlaceholders1 = TaskPlaceholders<typeof grammarCheckTask>;

type TaskPlaceholders2 = TaskPlaceholders<typeof summarizeTask>;
type TestTaskPlaceholders2 = AssertTrue<
  ExactlyExtends<TaskPlaceholders2, "text-type" | "language">
>;

// 4. Validate AgentsPlaceholders

type AgentsPlaceholdersResult = AgentsPlaceholders<
  [typeof grammarChecker, typeof meetingSummarizer]
>;
type TestAgentsPlaceholders = AssertTrue<
  ExactlyExtends<
    AgentsPlaceholdersResult,
    | "text"
    | "custom-dictionary"
    | "text-type"
    | "company-description"
    | "important-items"
  >
>;

// 5. Validate TasksPlaceholders

type TasksPlaceholdersResult = TasksPlaceholders<
  [typeof grammarCheckTask, typeof summarizeTask]
>;
type TestTasksPlaceholders = AssertTrue<
  ExactlyExtends<TasksPlaceholdersResult, "text" | "text-type" | "language">
>;

// 6. Validate AllPlaceholders

type AllPlaceholdersResult = AllPlaceholders<
  [typeof grammarChecker, typeof meetingSummarizer],
  [typeof grammarCheckTask, typeof summarizeTask]
>;
type TestAllPlaceholders = AssertTrue<
  ExactlyExtends<
    AllPlaceholdersResult,
    | "text"
    | "custom-dictionary"
    | "text-type"
    | "company-description"
    | "important-items"
    | "language"
  >
>;

// 7. Validate PlaceholderInput

type WorkflowInput = PlaceholderInput<
  [typeof grammarChecker, typeof meetingSummarizer],
  [typeof grammarCheckTask, typeof summarizeTask]
>;
type TestPlaceholderInput = AssertTrue<
  ExactlyExtends<
    WorkflowInput,
    {
      text: string | number;
      "custom-dictionary": string | number;
      "text-type": string | number;
      "company-description": string | number;
      "important-items": string | number;
      language: string | number;
    }
  >
>;

// 8. Validate Workflow

const testWorkflow = new Workflow({
  tasks: [grammarCheckTask, summarizeTask],
  agents: [grammarChecker, meetingSummarizer],
});

type InitiateWorkflowInput = Parameters<typeof testWorkflow.initiate>[0];
type TestWorkflowInitiate = AssertTrue<
  ExactlyExtends<
    InitiateWorkflowInput,
    {
      input: {
        text: string | number;
        "custom-dictionary": string | number;
        "text-type": string | number;
        "company-description": string | number;
        "important-items": string | number;
        language: string | number;
      };
    }
  >
>;

console.log("All type validations passed!");
