require("dotenv").config();
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
      {
        role: "system",
        content:
          "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
      },
    ],
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    max_tokens: 200,
    temperature: 0,
  });

  const answer = response.choices[0].message.content;
  if (answer == "react") {
    res.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    });
    return;
  }

  if (answer === "node") {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [nodeBasePrompt],
    });
    return;
  }
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  const systemPrompt = getSystemPrompt();

  const formattedMessages= [{role:"system", content:systemPrompt}, 
    ...messages
  ]

  const response = await openai.chat.completions.create({
    messages:formattedMessages,
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    max_tokens: 8000,
    temperature: 0,
  });

  res.json({
    response: response.choices[0].message.content,
  });
});

app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});;