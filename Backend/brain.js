/*
============================================================
CrazeMind Brain
Brand: CrazeStudio
============================================================
*/

import {
    trainCrazeMind,
    downloadWeights,
    getTrainingStats,
    recall
} from "./trainer.js";


const AI_NAME = "CrazeMind";
const BRAND = "CrazeStudio";


/* ============================================================
   OPTIONAL MODULES
============================================================ */

let modelModule = null;
let searchModule = null;
let basicModule = null;


try {
    modelModule = await import("./model.js");
} catch (error) {
    console.warn("model.js unavailable:", error);
}


try {
    searchModule = await import("./search.js");
} catch (error) {
    console.warn("search.js unavailable:", error);
}


try {
    basicModule = await import("./basic.js");
} catch (error) {
    console.warn("basic.js unavailable:", error);
}


/* ============================================================
   HELPERS
============================================================ */

function cleanText(text) {
    return String(text || "").trim();
}


function commandOf(text) {

    const value = cleanText(text);

    if (!value.startsWith("/")) {
        return null;
    }

    return value
        .split(/\s+/)[0]
        .slice(1)
        .toLowerCase();
}


function argumentsOf(text) {

    const parts =
        cleanText(text).split(/\s+/);

    parts.shift();

    return parts.join(" ").trim();
}


/* ============================================================
   HELP
============================================================ */

function help() {

    return `
# ${AI_NAME}

Created by **${BRAND}**.

## Commands

- \`/train 100\` — train 100 rows
- \`/train 1000\` — train 1000 rows
- \`/train full\` — train the whole dataset
- \`/train all\` — train the whole dataset
- \`/train 0\` — train the whole dataset
- \`/stats\` — training statistics
- \`/export\` — export learned data
- \`/search <query>\` — web search
- \`/wiki <topic>\` — Wikipedia
- \`/math <expression>\` — calculate
- \`/about\` — about CrazeMind
- \`/help\` — commands
`;
}


/* ============================================================
   ABOUT
============================================================ */

function about() {

    return `
# ${AI_NAME}

**Brand:** ${BRAND}

CrazeMind is a JavaScript AI project using local
training/retrieval, Llama-Instruct data, search,
mathematics and model generation.

**Created by:** ${BRAND}
`;
}


/* ============================================================
   MATH
============================================================ */

function math(expression) {

    let exp = cleanText(expression);

    if (!exp) {
        return "Usage: `/math 25 * 25`";
    }

    exp = exp
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\^/g, "**");

    if (!/^[0-9+\-*/%().\s*]+$/.test(exp)) {
        return "Invalid mathematical expression.";
    }

    try {

        const result =
            Function(
                `"use strict"; return (${exp})`
            )();

        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {
            throw new Error("Invalid result");
        }

        return `## Result\n\n\`${result}\``;

    } catch {
        return "I couldn't calculate that.";
    }
}


/* ============================================================
   SEARCH
============================================================ */

async function search(query) {

    if (!query) {
        return {
            answer: "Usage: `/search your query`",
            sources: []
        };
    }

    if (!searchModule) {
        return {
            answer: "Search module is unavailable.",
            sources: []
        };
    }

    const fn =
        searchModule.search ||
        searchModule.webSearch ||
        searchModule.searchWeb ||
        searchModule.default;

    if (typeof fn !== "function") {
        return {
            answer:
                "search.js does not export a search function.",
            sources: []
        };
    }

    try {

        const result =
            await fn(query);

        if (typeof result === "string") {

            return {
                answer: result,
                sources: []
            };
        }

        return {
            answer:
                result?.answer ||
                result?.text ||
                result?.content ||
                "No results found.",

            sources:
                result?.sources ||
                result?.urls ||
                []
        };

    } catch (error) {

        return {
            answer:
                `## Search Error\n\n\`${error.message}\``,
            sources: []
        };
    }
}


/* ============================================================
   WIKIPEDIA
============================================================ */

async function wiki(query) {

    if (!query) {

        return {
            answer:
                "Usage: `/wiki topic`",
            sources: []
        };
    }

    try {

        const url =
            "https://en.wikipedia.org/api/rest_v1/page/summary/" +
            encodeURIComponent(query);

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Wikipedia returned ${response.status}`
            );
        }

        const data =
            await response.json();

        const page =
            data?.content_urls?.desktop?.page;

        return {

            answer:
                `# ${data.title || query}\n\n` +
                (
                    data.description
                        ? `*${data.description}*\n\n`
                        : ""
                ) +
                (
                    data.extract ||
                    "No summary available."
                ),

            sources:
                page ? [page] : []
        };

    } catch (error) {

        return {

            answer:
                `## Wikipedia Error\n\n\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   TRAIN
============================================================ */

async function train(argument) {

    const value =
        cleanText(argument).toLowerCase();

    let amount;

    /*
       FULL DATASET
    */

    if (
        value === "full" ||
        value === "all" ||
        value === "0"
    ) {

        amount = 0;

    } else if (!value) {

        amount = 20;

    } else {

        amount = Number(value);

        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            return {

                answer:
                    "## Training Error\n\n" +
                    "Use `/train 100` or `/train full`.",

                sources: []
            };
        }
    }


    try {

        const result =
            await trainCrazeMind(
                amount,
                {
                    onProgress(progress) {

                        console.log(
                            "[CrazeMind]",
                            progress
                        );


                        /*
                           Your HTML can listen to this.
                        */

                        if (
                            typeof window !== "undefined" &&
                            typeof window
                                .onCrazeTrainingProgress ===
                                "function"
                        ) {

                            window
                                .onCrazeTrainingProgress(
                                    progress
                                );
                        }
                    }
                }
            );


        return {

            answer:
                result.wholeDataset

                    ? (
                        `# Full Training Complete\n\n` +
                        `CrazeMind processed the whole available dataset.\n\n` +
                        `- Dataset rows: **${result.datasetRows}**\n` +
                        `- Examples learned: **${result.trainedExamples}**\n` +
                        `- Dataset: \`${result.dataset}\`\n` +
                        `- Split: \`${result.split}\`\n` +
                        `- Storage: **IndexedDB**`
                    )

                    : (
                        `# Training Complete\n\n` +
                        `- Dataset rows: **${result.datasetRows}**\n` +
                        `- Examples learned: **${result.trainedExamples}**\n` +
                        `- Dataset: \`${result.dataset}\`\n` +
                        `- Storage: **IndexedDB**`
                    ),

            sources: []
        };

    } catch (error) {

        console.error(
            "CrazeMind training error:",
            error
        );

        return {

            answer:
                `## Training Error\n\n` +
                `\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   STATS
============================================================ */

async function stats() {

    try {

        const result =
            await getTrainingStats();

        return {

            answer:
                `# CrazeMind Training\n\n` +
                `**Examples:** ${result.examples}\n\n` +
                `**Dataset:** \`${result.dataset}\`\n\n` +
                `**Mode:** \`${result.mode}\``,

            sources: []
        };

    } catch (error) {

        return {

            answer:
                `## Stats Error\n\n\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   EXPORT
============================================================ */

async function exportData() {

    try {

        await downloadWeights();

        return {

            answer:
                "# Export Complete\n\n" +
                "Downloaded **crazemind-training.json**.",

            sources: []
        };

    } catch (error) {

        return {

            answer:
                `## Export Error\n\n\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   MODEL
============================================================ */

async function modelAnswer(question) {

    if (!modelModule) {
        return null;
    }

    const functions = [

        modelModule.generate,
        modelModule.generateText,
        modelModule.predict,
        modelModule.answer,
        modelModule.brain,
        modelModule.default

    ];

    for (const fn of functions) {

        if (typeof fn !== "function") {
            continue;
        }

        try {

            const result =
                await fn(question);

            if (
                typeof result === "string" &&
                result.trim()
            ) {

                return result;
            }

            if (
                result &&
                typeof result === "object"
            ) {

                return (
                    result.answer ||
                    result.text ||
                    result.output ||
                    result.response ||
                    null
                );
            }

        } catch (error) {

            console.warn(
                "Model error:",
                error
            );
        }
    }

    return null;
}


/* ============================================================
   BASIC
============================================================ */

async function basicAnswer(question) {

    if (!basicModule) {
        return null;
    }

    const functions = [

        basicModule.answer,
        basicModule.basicAnswer,
        basicModule.respond,
        basicModule.generate,
        basicModule.default

    ];

    for (const fn of functions) {

        if (typeof fn !== "function") {
            continue;
        }

        try {

            const result =
                await fn(question);

            if (
                typeof result === "string" &&
                result.trim()
            ) {

                return result;
            }

            if (
                result &&
                typeof result === "object"
            ) {

                return (
                    result.answer ||
                    result.text ||
                    result.output ||
                    null
                );
            }

        } catch (error) {

            console.warn(
                "Basic engine error:",
                error
            );
        }
    }

    return null;
}


/* ============================================================
   COMMAND ROUTER
============================================================ */

async function handleCommand(input) {

    const command =
        commandOf(input);

    const argument =
        argumentsOf(input);


    switch (command) {

        case "help":
            return {
                answer: help(),
                sources: []
            };


        case "about":
            return {
                answer: about(),
                sources: []
            };


        case "train":
            return await train(argument);


        case "stats":
            return await stats();


        case "export":
            return await exportData();


        case "math":
            return {
                answer: math(argument),
                sources: []
            };


        case "search":
            return await search(argument);


        case "wiki":
        case "wikipedia":
            return await wiki(argument);


        default:
            return {
                answer:
                    `Unknown command \`/${command}\`.\n\n` +
                    `Use \`/help\`.`,
                sources: []
            };
    }
}


/* ============================================================
   ⭐ PUBLIC API
============================================================ */

/*
   THIS IS THE IMPORTANT PART.

   Your frontend can now do:

   import {
       answerQuestion
   } from "../Backend/brain.js";
*/

export async function answerQuestion(question) {

    const input =
        cleanText(question);

    if (!input) {

        return {

            answer:
                "Please enter a question.",

            sources: []
        };
    }


    /* Commands */

    if (
        input.startsWith("/")
    ) {

        return await handleCommand(
            input
        );
    }


    /* Trained knowledge */

    try {

        const learned =
            await recall(input);

        if (learned) {

            return {

                answer: learned,

                sources:
                    ["CrazeMind Training"]
            };
        }

    } catch (error) {

        console.warn(
            "Recall error:",
            error
        );
    }


    /* Model */

    try {

        const generated =
            await modelAnswer(input);

        if (generated) {

            return {

                answer: generated,

                sources: []
            };
        }

    } catch (error) {

        console.warn(
            "Model error:",
            error
        );
    }


    /* Basic engine */

    try {

        const basic =
            await basicAnswer(input);

        if (basic) {

            return {

                answer: basic,

                sources: []
            };
        }

    } catch (error) {

        console.warn(
            "Basic error:",
            error
        );
    }


    /* Final fallback */

    return {

        answer:
            `I don't know that yet.\n\n` +
            `Try \`/search ${input}\` or train me with \`/train 100\`.`,
        
        sources: []
    };
}


/* ============================================================
   NAMED EXPORTS
============================================================ */

export const brain =
    answerQuestion;

export const ask =
    answerQuestion;


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default answerQuestion;