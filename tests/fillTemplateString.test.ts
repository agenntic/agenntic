import fillTemplateString from "../src/utils/fillTemplateString";

describe("fillTemplateString", () => {
  test("replaces single placeholder with string value", () => {
    const template = "Hello, {name}!";
    const values = { name: "Alice" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("Hello, Alice!");
  });

  test("replaces multiple placeholders with corresponding values", () => {
    const template = "Hello, {firstName} {lastName}!";
    const values = { firstName: "John", lastName: "Doe" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("Hello, John Doe!");
  });

  test("handles numeric values for placeholders", () => {
    const template = "You have {count} new messages.";
    const values = { count: 5 };
    const result = fillTemplateString(template, values);
    expect(result).toBe("You have 5 new messages.");
  });

  test("leaves placeholders intact if values are missing", () => {
    const template = "Hello, {name}! You are {age} years old.";
    const values = { name: "Bob" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("Hello, Bob! You are {age} years old.");
  });

  test("handles escaped curly braces correctly", () => {
    const template = "Set is written as \\{a, b, c\\}.";
    const values = {};
    const result = fillTemplateString(template, values);
    expect(result).toBe("Set is written as {a, b, c}.");
  });

  test("returns the same string when there are no placeholders", () => {
    const template = "No placeholders here.";
    const values = { irrelevant: "value" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("No placeholders here.");
  });

  test("handles empty template string", () => {
    const template = "";
    const values = { any: "value" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("");
  });

  test("leaves all placeholders intact when values object is empty", () => {
    const template = "Hello, {name}! Welcome to {place}.";
    const values = {};
    const result = fillTemplateString(template, values);
    expect(result).toBe("Hello, {name}! Welcome to {place}.");
  });

  test("replaces multiple instances of the same placeholder", () => {
    const template = "{greeting}, {greeting}!";
    const values = { greeting: "Hi" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("Hi, Hi!");
  });

  test("handles values with special characters", () => {
    const template = "Password: {password}";
    const values = { password: "P@$$w0rd!" };
    const result = fillTemplateString(template, values);
    expect(result).toBe("Password: P@$$w0rd!");
  });
});
