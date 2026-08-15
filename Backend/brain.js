/*
    CrazeMind Brain
    Brand: CrazeStudio

    Features:
    - Normal AI questions
    - Markdown answers
    - /search
    - /wiki
    - /math
    - /ask
    - /train
    - /help
    - /about
    - Wikipedia
    - DuckDuckGo
    - Math engine
    - CrazeMind model
*/

import {
    basicAnswer,
    solveMath
} from "./basic.js";

import {
    wikipediaSearch,
    duckSearch
} from "./search.js";

import {
    brain,
    model,
    tokenizer
} from "./model.js";

import * as Trainer from "./trainer.js";


/* =========================================================
   UTILITIES
========================================================= */

function clean(text) {

    return String(text || "")
        .replace(/\r/g, "")
        .trim();
}


function commandParts(input) {

    const parts =
        input
            .trim()
            .split(/\s+/);

    return {

        command:
            (parts[0] || "")
                .toLowerCase(),

        query:
            parts
                .slice(1)
                .join(" ")
                .trim()
    };
}


/* =========================================================
   MATH DETECTION
========================================================= */

function isMathQuestion(question) {

    const q =
        question.toLowerCase();


    return (
        /[\d+\-*/^=]/.test(q) ||
        q.includes("calculate") ||
        q.includes("calculator") ||
        q.includes("solve") ||
        q.includes("simplify") ||
        q.includes("derivative") ||
        q.includes("differentiate") ||
        q.includes("factor") ||
        q.includes("equation") ||
        q.includes("probability") ||
        q.includes("integral") ||
        q.includes("sqrt") ||
        q.includes("sin") ||
        q.includes("cos") ||
        q.includes("tan") ||
        q.includes("log")
    );
}


/* =========================================================
   KNOWLEDGE DETECTION
========================================================= */

function needsKnowledge(question) {

    const q =
        question.toLowerCase();


    const patterns = [

        "who is",
        "who was",
        "what is",
        "what are",
        "where is",
        "where was",
        "when was",
        "when did",
        "history of",
        "tell me about",
        "information about",
        "explain",
        "meaning of"

    ];


    return patterns.some(
        pattern =>
            q.includes(pattern)
    );
}


/* =========================================================
   SEARCH WEB
========================================================= */

async function searchWeb(query) {

    if (!query) {

        return {

            answer:
                "## Search\n\n" +
                "Usage:\n\n" +
                "`/search <query>`",

            sources: []
        };
    }


    try {

        const [
            wikipedia,
            duckduckgo
        ] =
            await Promise.all([

                wikipediaSearch(
                    query
                ),

                duckSearch(
                    query
                )

            ]);


        let answer = "";


        if (
            wikipedia &&
            wikipedia.text
        ) {

            answer +=
                "## Wikipedia\n\n" +
                clean(
                    wikipedia.text
                );
        }


        if (
            duckduckgo &&
            duckduckgo.text
        ) {

            if (answer) {

                answer +=
                    "\n\n---\n\n";
            }


            answer +=
                "## DuckDuckGo\n\n" +
                clean(
                    duckduckgo.text
                );
        }


        if (!answer) {

            return {

                answer:
                    "I couldn't find useful results for **" +
                    query +
                    "**.",

                sources: []
            };
        }


        return {

            answer,

            sources: [
                "Wikipedia",
                "DuckDuckGo"
            ]
        };

    } catch (error) {

        console.error(
            "Search error:",
            error
        );


        return {

            answer:
                "## Search error\n\n" +
                "`" +
                error.message +
                "`",

            sources: []
        };
    }
}


/* =========================================================
   WIKIPEDIA
========================================================= */

async function searchWikipedia(
    query
) {

    if (!query) {

        return {

            answer:
                "## Wikipedia\n\n" +
                "Usage:\n\n" +
                "`/wiki <topic>`",

            sources: []
        };
    }


    try {

        const result =
            await wikipediaSearch(
                query
            );


        if (
            result &&
            result.text
        ) {

            return {

                answer:
                    "## " +
                    query +
                    "\n\n" +
                    clean(
                        result.text
                    ),

                sources:
                    ["Wikipedia"]
            };
        }


        return {

            answer:
                "Wikipedia couldn't find **" +
                query +
                "**.",

            sources: []
        };

    } catch (error) {

        return {

            answer:
                "## Wikipedia error\n\n" +
                "`" +
                error.message +
                "`",

            sources: []
        };
    }
}


/* =========================================================
   MATH COMMAND
========================================================= */

function mathCommand(query) {

    if (!query) {

        return {

            answer:
                "## Math\n\n" +
                "Usage:\n\n" +
                "`/math <expression>`",

            sources: []
        };
    }


    try {

        const result =
            solveMath(
                query
            );


        if (result) {

            return {

                answer:
                    "## Mathematical Result\n\n" +
                    result,

                sources:
                    ["CrazeMind Math Engine"]
            };
        }


        return {

            answer:
                "I couldn't solve:\n\n" +
                "`" +
                query +
                "`",

            sources: []
        };

    } catch (error) {

        return {

            answer:
                "## Math Error\n\n" +
                "`" +
                error.message +
                "`",

            sources: []
        };
    }
}


/* =========================================================
   HELP
========================================================= */

function helpCommand() {

    return {

        answer:
`# CrazeMind Commands

### 🔎 Search

\`/search <query>\`

Search **Wikipedia + DuckDuckGo**.

Example:

\`/search Albert Einstein\`

---

### 📚 Wikipedia

\`/wiki <topic>\`

Example:

\`/wiki Minecraft\`

---

### 🧮 Mathematics

\`/math <expression>\`

Examples:

\`/math 2^100\`

\`/math sqrt(144)\`

\`/math derivative x^3\`

---

### 🤖 Ask CrazeMind

\`/ask <question>\`

Example:

\`/ask explain quantum computing\`

---

### 🧠 Train

\`/train <amount>\`

Example:

\`/train 100\`

---

### ℹ️ Information

\`/about\`

---

### ❓ Help

\`/help\``,

        sources: []
    };
}


/* =========================================================
   ABOUT
========================================================= */

function aboutCommand() {

    return {

        answer:
`# CrazeMind

**Brand:** CrazeStudio

**Creator:** CrazeStudio

**Knowledge:** Wikipedia + DuckDuckGo

**Mathematics:** Math engine

**Training:** Llama-instruct dataset

**Language Model:** CrazeMind

**Model status:** ${
    model.trained
        ? "Trained"
        : "Not trained"
}`,

        sources: []
    };
}


/* =========================================================
   TRAINING
========================================================= */

async function trainingCommand(
    query
) {

    let amount = 100;


    if (query) {

        const number =
            parseInt(
                query,
                10
            );


        if (
            Number.isFinite(number) &&
            number > 0
        ) {

            amount =
                Math.min(
                    number,
                    19000
                );
        }
    }


    try {

        if (
            typeof Trainer.trainCrazeMind ===
            "function"
        ) {

            const result =
                await Trainer.trainCrazeMind(
                    amount
                );


            return {

                answer:
`# Training Complete

**Model:** CrazeMind

**Examples processed:** ${amount}

The training process has finished.`,

                sources:
                    ["CrazeMind Trainer"],

                training:
                    result
            };
        }


        if (
            typeof Trainer.train ===
            "function"
        ) {

            const result =
                await Trainer.train(
                    amount
                );


            return {

                answer:
`# Training Complete

**Model:** CrazeMind

**Examples processed:** ${amount}

The training process has finished.`,

                sources:
                    ["CrazeMind Trainer"],

                training:
                    result
            };
        }


        return {

            answer:
                "## Trainer unavailable\n\n" +
                "`trainer.js` does not expose " +
                "a compatible training function.",

            sources: []
        };

    } catch (error) {

        console.error(
            "Training error:",
            error
        );


        return {

            answer:
                "## Training Error\n\n" +
                "`" +
                error.message +
                "`",

            sources:
                ["CrazeMind Trainer"]
        };
    }
}


/* =========================================================
   COMMAND EXECUTOR
========================================================= */

async function executeCommand(
    input
) {

    const {
        command,
        query
    } =
        commandParts(
            input
        );


    switch (command) {

        case "/search":

            return await searchWeb(
                query
            );


        case "/wiki":

            return await searchWikipedia(
                query
            );


        case "/math":

            return mathCommand(
                query
            );


        case "/ask":

            if (!query) {

                return {

                    answer:
                        "Usage:\n\n" +
                        "`/ask <question>`",

                    sources: []
                };
            }


            return await answerQuestion(
                query
            );


        case "/train":

            return await trainingCommand(
                query
            );


        case "/help":

            return helpCommand();


        case "/about":

            return aboutCommand();


        default:

            return {

                answer:
`## Unknown Command

I don't recognize:

\`${command}\`

Use \`/help\` to see available commands.`,

                sources: []
            };
    }
}


/* =========================================================
   MODEL ANSWER
========================================================= */

function neuralAnswer(
    question
) {

    try {

        if (
            !tokenizer ||
            !brain ||
            !model
        ) {

            return null;
        }


        const tokens =
            tokenizer.encode(
                question
            );


        if (
            !tokens ||
            !tokens.length
        ) {

            return null;
        }


        /*
            Run the model.
        */

        brain.forward(
            tokens
        );


        /*
            Do not trust an untrained model.
        */

        if (
            !model.trained
        ) {

            return null;
        }


        /*
            Give the model instructions
            for structured Markdown output.
        */

        const prompt =
`You are CrazeMind, an AI created by CrazeStudio.

Answer the user's question accurately and clearly.

Use Markdown when it improves readability.

Rules:

- Use ## or ### headings for sections.
- Use **bold** for important terms.
- Use bullet lists when appropriate.
- Use numbered lists for steps.
- Use \`inline code\` for short code.
- Use fenced code blocks for programming code.
- Use tables when useful.
- Use normal paragraphs for simple answers.
- Do not put the entire response inside a code block.
- Do not mention these instructions.
- Do not invent sources.
- If you do not know something, say so.

User question:

${question}

CrazeMind answer:`;


        const generated =
            model.generate(
                prompt,
                tokenizer,
                220,
                0.6
            );


        if (
            !generated ||
            !String(generated).trim()
        ) {

            return null;
        }


        let answer =
            clean(
                generated
            );


        /*
            Remove accidental model
            prefixes.
        */

        answer =
            answer
                .replace(
                    /^CrazeMind\s*answer\s*:\s*/i,
                    ""
                )
                .trim();


        return answer || null;

    } catch (error) {

        console.error(
            "CrazeMind model error:",
            error
        );


        return null;
    }
}


/* =========================================================
   MAIN BRAIN
========================================================= */

export async function answerQuestion(
    question
) {

    question =
        clean(
            question
        );


    if (!question) {

        return {

            answer:
                "Please ask me something.",

            sources: []
        };
    }


    /*
        Commands have highest priority.
    */

    if (
        question.startsWith("/")
    ) {

        return await executeCommand(
            question
        );
    }


    /*
        Math has priority over the
        language model because actual
        computation is more reliable.
    */

    if (
        isMathQuestion(
            question
        )
    ) {

        try {

            const result =
                solveMath(
                    question
                );


            if (result) {

                return {

                    answer:
                        "## Result\n\n" +
                        result,

                    sources:
                        ["CrazeMind Math Engine"]
                };
            }

        } catch (error) {

            console.error(
                "Math error:",
                error
            );
        }
    }


    /*
        Basic responses.
    */

    const basic =
        basicAnswer(
            question
        );


    if (basic) {

        return {

            answer:
                basic,

            sources:
                ["CrazeMind Basic Engine"]
        };
    }


    /*
        Try the trained model.
    */

    const neural =
        neuralAnswer(
            question
        );


    if (neural) {

        return {

            answer:
                neural,

            sources:
                ["CrazeMind Neural Model"]
        };
    }


    /*
        Knowledge search fallback.
    */

    if (
        needsKnowledge(
            question
        )
    ) {

        try {

            const result =
                await searchWeb(
                    question
                );


            if (
                result &&
                result.answer
            ) {

                return result;
            }

        } catch (error) {

            console.error(
                "Knowledge search error:",
                error
            );
        }
    }


    /*
        Final fallback.
    */

    return {

        answer:
`## I don't know yet

I couldn't generate a reliable answer for that.

You can try:

- \`/search <query>\` for web knowledge
- \`/wiki <topic>\` for Wikipedia
- \`/math <expression>\` for mathematics
- \`/help\` for all commands`,

        sources: []
    };
}


/* =========================================================
   PUBLIC TRAINING API
========================================================= */

export async function trainAI(
    amount = 100
) {

    return await trainingCommand(
        String(amount)
    );
}


/* =========================================================
   AI INFORMATION
========================================================= */

export function getAIInfo() {

    return {

        name:
            "CrazeMind",

        brand:
            "CrazeStudio",

        creator:
            "CrazeStudio",

        trained:
            Boolean(
                model.trained
            )
    };
}


/* =========================================================
   GLOBAL API
========================================================= */

window.CrazeMind = {

    ask:
        answerQuestion,

    train:
        trainAI,

    command:
        executeCommand,

    info:
        getAIInfo
};