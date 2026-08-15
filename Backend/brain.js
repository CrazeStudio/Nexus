/*
============================================================
CrazeMind Brain
CrazeStudio
============================================================

Architecture:

USER
  ↓
brain.js
  ↓
Commands
  ↓
Local IndexedDB memory
  ↓
Local math
  ↓
Local knowledge
  ↓
Gemini API
  ↓
Save Gemini answer to local memory

IMPORTANT:
Gemini is ONLY a fallback.

GitHub Pages:
The Gemini API is called directly from the browser.

WARNING:
A Gemini API key in frontend JavaScript is visible to users.
Use this only for testing/personal use.
============================================================
*/


/* ============================================================
   IMPORTS
============================================================ */

import {
    recall,
    learn,
    trainCrazeMind,
    getTrainingStats,
    downloadWeights,
    clearTraining
} from "./trainer.js";


import {
    searchText
} from "./search.js";


/* ============================================================
   CONFIGURATION
============================================================ */

const GEMINI_API_KEY =
    typeof window !== "undefined"
        ? String(
            window
                ?.CRAZEMIND_CONFIG
                ?.GEMINI_API_KEY ||
            ""
        ).trim()
        : "";


const GEMINI_MODEL =
    "gemini-2.5-flash";


/* ============================================================
   INTERNAL STATE
============================================================ */

let lastSource =
    "local";


/* ============================================================
   GET LAST SOURCE
============================================================ */

export function getLastAnswerSource() {

    return lastSource;
}


/* ============================================================
   NORMALIZE
============================================================ */

function normalize(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


/* ============================================================
   CREATE ANSWER OBJECT
============================================================ */

function makeAnswer(
    answer,
    source = lastSource
) {

    return {

        answer:
            String(
                answer ?? ""
            ),

        sources:
            source
                ? [source]
                : []

    };
}


/* ============================================================
   LOCAL MATH
============================================================ */

export function solveMath(input) {

    let expression =
        String(
            input || ""
        ).trim();


    expression =
        expression
            .replace(
                /^(calculate|solve|what is|what's)\s+/i,
                ""
            )
            .replace(
                /\?+$/,
                ""
            )
            .trim();


    expression =
        expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/−/g, "-")
            .replace(/π/gi, "Math.PI");


    if (!expression) {

        return null;
    }


    /*
        Allow only mathematical characters.

        Math.PI is allowed because π is converted
        above, but property access is NOT allowed
        through user input.
    */

    if (
        !/^[0-9+\-*/().%\s^]+$/.test(
            expression
        )
    ) {

        return null;
    }


    expression =
        expression.replace(
            /\^/g,
            "**"
        );


    try {

        const result =
            Function(
                `"use strict"; return (${expression})`
            )();


        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {

            return null;
        }


        return result;

    } catch {

        return null;
    }
}


/* ============================================================
   MATH DETECTION
============================================================ */

function isMathQuestion(input) {

    const text =
        String(
            input || ""
        ).trim();


    if (!text) {

        return false;
    }


    return (
        /^(calculate|solve|what\s+is|what's)?\s*[-+*/().%\d\s×÷−^]+[?]?$/i
            .test(text)
    );
}


/* ============================================================
   LOCAL KNOWLEDGE
============================================================ */

export function localConversation(input) {

    const text =
        normalize(input);


    /* --------------------------------------------------------
       Greetings
    -------------------------------------------------------- */

    if (
        /^(hello|hi|hey|hii|helo|yo)$/.test(
            text
        )
    ) {

        return (
            "Hello! I'm **CrazeMind**, " +
            "created by **CrazeStudio**. " +
            "How can I help?"
        );
    }


    /* --------------------------------------------------------
       Creator
    -------------------------------------------------------- */

    if (
        text.includes("who created you") ||
        text.includes("who made you") ||
        text.includes("who built you")
    ) {

        return (
            "## CrazeMind\n\n" +
            "I'm **CrazeMind**, an AI project " +
            "created by **CrazeStudio**."
        );
    }


    /* --------------------------------------------------------
       CrazeMind
    -------------------------------------------------------- */

    if (
        text === "what is crazemind"
    ) {

        return (
            "## CrazeMind\n\n" +
            "CrazeMind is an AI project created " +
            "by **CrazeStudio**.\n\n" +
            "It has a local memory system, " +
            "training system, search commands, " +
            "local reasoning, and an optional " +
            "Gemini fallback."
        );
    }


    /* --------------------------------------------------------
       AI
    -------------------------------------------------------- */

    if (
        text === "what is ai" ||
        text === "what is artificial intelligence"
    ) {

        return (
            "## Artificial Intelligence\n\n" +
            "Artificial intelligence (AI) is the " +
            "field of creating computer systems " +
            "that can perform tasks that normally " +
            "require human intelligence."
        );
    }


    /* --------------------------------------------------------
       HTML
    -------------------------------------------------------- */

    if (
        text === "what is html"
    ) {

        return (
            "## HTML\n\n" +
            "HTML stands for **HyperText Markup " +
            "Language**.\n\n" +
            "It provides the structure of web pages."
        );
    }


    /* --------------------------------------------------------
       CSS
    -------------------------------------------------------- */

    if (
        text === "what is css"
    ) {

        return (
            "## CSS\n\n" +
            "CSS stands for **Cascading Style " +
            "Sheets**.\n\n" +
            "It controls the appearance and layout " +
            "of web pages."
        );
    }


    /* --------------------------------------------------------
       JavaScript
    -------------------------------------------------------- */

    if (
        text === "what is javascript"
    ) {

        return (
            "## JavaScript\n\n" +
            "JavaScript is a programming language " +
            "commonly used to create interactive " +
            "websites and web applications."
        );
    }


    /* --------------------------------------------------------
       Python
    -------------------------------------------------------- */

    if (
        text === "what is python"
    ) {

        return (
            "## Python\n\n" +
            "Python is a high-level programming " +
            "language known for its readable syntax " +
            "and large ecosystem."
        );
    }


    return null;
}


/* ============================================================
   GEMINI API
============================================================ */

export async function askGemini(question) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "Gemini API key is not configured."
        );
    }


    const endpoint =
        "https://generativelanguage.googleapis.com/" +
        "v1beta/models/" +
        GEMINI_MODEL +
        ":generateContent";


    let response;


    try {

        response =
            await fetch(
                endpoint,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            GEMINI_API_KEY
                    },

                    body:
                        JSON.stringify({

                            contents: [

                                {

                                    role: "user",

                                    parts: [

                                        {
                                            text:
                                                question
                                        }

                                    ]

                                }

                            ],

                            generationConfig: {

                                temperature:
                                    0.7,

                                maxOutputTokens:
                                    2048
                            }

                        })
                }
            );

    } catch (error) {

        throw new Error(
            "Network error while contacting Gemini: " +
            (
                error?.message ||
                String(error)
            )
        );
    }


    const raw =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                raw
            );

    } catch {

        throw new Error(
            "Gemini returned invalid JSON."
        );
    }


    if (
        !response.ok
    ) {

        throw new Error(
            data
                ?.error
                ?.message ||
            `Gemini HTTP ${response.status}`
        );
    }


    const answer =
        data
            ?.candidates?.[0]
            ?.content
            ?.parts
            ?.map(
                part =>
                    part?.text || ""
            )
            .join("")
            .trim();


    if (!answer) {

        const reason =
            data
                ?.promptFeedback
                ?.blockReason ||
            "Gemini returned no text.";


        throw new Error(
            reason
        );
    }


    return answer;
}


/* ============================================================
   /SEARCH
============================================================ */

async function handleSearch(input) {

    const query =
        input
            .slice(
                "/search".length
            )
            .trim();


    if (!query) {

        return (
            "Usage: `/search your query`"
        );
    }


    lastSource =
        "search";


    const result =
        await searchText(
            query
        );


    /*
        Make sure search always produces
        displayable text.
    */

    if (
        result === null ||
        result === undefined
    ) {

        return "No results found.";
    }


    if (
        typeof result === "string"
    ) {

        return result;
    }


    /*
        Support search.js returning an object.
    */

    if (
        typeof result === "object"
    ) {

        if (
            typeof result.answer ===
            "string"
        ) {

            return result.answer;
        }


        if (
            typeof result.text ===
            "string"
        ) {

            return result.text;
        }


        try {

            return JSON.stringify(
                result,
                null,
                2
            );

        } catch {

            return "No results found.";
        }
    }


    return String(
        result
    );
}


/* ============================================================
   /TRAIN
============================================================ */

async function handleTrain(input) {

    const argument =
        input
            .slice(
                "/train".length
            )
            .trim()
            .toLowerCase();


    let amount;


    /*
        0 / full / all =
        full dataset.
    */

    if (
        argument === "0" ||
        argument === "full" ||
        argument === "all"
    ) {

        amount =
            0;

    } else {

        amount =
            Number(
                argument
            );


        if (
            !Number.isFinite(amount) ||
            amount < 1
        ) {

            amount =
                100;
        }
    }


    lastSource =
        "training";


    const result =
        await trainCrazeMind(
            amount,
            {

                onProgress:
                    progress => {

                        console.log(
                            "[CrazeMind]",
                            progress
                        );


                        if (
                            typeof window !==
                            "undefined" &&
                            typeof window
                                .onCrazeMindTrainingProgress ===
                            "function"
                        ) {

                            window
                                .onCrazeMindTrainingProgress(
                                    progress
                                );
                        }

                    }

            }
        );


    if (
        !result
    ) {

        return (
            "## Training Error\n\n" +
            "The training system returned no result."
        );
    }


    return (

        "## Training Complete\n\n" +

        `- Dataset: \`${result.dataset ?? "unknown"}\`\n` +

        `- Rows processed: **${result.datasetRows ?? 0}**\n` +

        `- Examples stored: **${result.trainedExamples ?? 0}**\n` +

        `- Mode: **${result.mode ?? "unknown"}**`
    );
}


/* ============================================================
   /STATS
============================================================ */

async function handleStats() {

    lastSource =
        "local";


    const stats =
        await getTrainingStats();


    if (
        !stats
    ) {

        return (
            "## CrazeMind Brain\n\n" +
            "No training statistics are available."
        );
    }


    return (

        "## CrazeMind Brain\n\n" +

        `- Stored examples: **${stats.examples ?? 0}**\n` +

        `- Dataset: \`${stats.dataset ?? "unknown"}\`\n` +

        `- Mode: **${stats.mode ?? "unknown"}**`
    );
}


/* ============================================================
   /CLEAR
============================================================ */

async function handleClear() {

    lastSource =
        "local";


    const success =
        await clearTraining();


    if (success) {

        return (
            "## Memory Cleared\n\n" +
            "CrazeMind's local training memory " +
            "has been cleared."
        );
    }


    return (
        "Could not clear CrazeMind's memory."
    );
}


/* ============================================================
   /DOWNLOAD
============================================================ */

async function handleDownload() {

    lastSource =
        "local";


    await downloadWeights();


    return (
        "Training data exported as " +
        "`crazemind-training.json`."
    );
}


/* ============================================================
   COMMAND HANDLER
============================================================ */

async function handleCommand(input) {

    const lower =
        normalize(
            input
        );


    if (
        lower === "/search" ||
        lower.startsWith("/search ")
    ) {

        return await handleSearch(
            input
        );
    }


    if (
        lower === "/train" ||
        lower.startsWith("/train ")
    ) {

        return await handleTrain(
            input
        );
    }


    if (
        lower === "/stats"
    ) {

        return await handleStats();
    }


    if (
        lower === "/clear"
    ) {

        return await handleClear();
    }


    if (
        lower === "/download"
    ) {

        return await handleDownload();
    }


    return null;
}


/* ============================================================
   MAIN BRAIN
============================================================ */

export async function answerQuestion(
    question,
    options = {}
) {

    const input =
        String(
            question || ""
        ).trim();


    /*
        Reset source for every question.
    */

    lastSource =
        "local";


    /*
    ============================================================
    EMPTY QUESTION
    ============================================================
    */

    if (!input) {

        return makeAnswer(
            "Please ask me something.",
            "local"
        );
    }


    /*
    ============================================================
    1. COMMANDS
    ============================================================
    */

    if (
        input.startsWith("/")
    ) {

        try {

            const commandResult =
                await handleCommand(
                    input
                );


            if (
                commandResult !== null
            ) {

                return makeAnswer(
                    commandResult,
                    lastSource
                );
            }

        } catch (error) {

            lastSource =
                "command-error";


            console.error(
                "[CrazeMind] Command error:",
                error
            );


            return makeAnswer(

                "## Command Error\n\n" +

                "`" +

                String(
                    error?.message ||
                    error ||
                    "Unknown command"
                )
                    .replace(
                        /`/g,
                        "'"
                    ) +

                "`",

                "command-error"
            );
        }
    }


    /*
    ============================================================
    2. LOCAL MEMORY
    ============================================================
    */

    try {

        const remembered =
            await recall(
                input
            );


        if (
            remembered &&
            String(
                remembered
            ).trim()
        ) {

            lastSource =
                "local-memory";


            console.log(
                "[CrazeMind] LOCAL MEMORY"
            );


            return makeAnswer(
                remembered,
                "local-memory"
            );
        }

    } catch (error) {

        console.warn(
            "[CrazeMind] Local memory error:",
            error
        );
    }


    /*
    ============================================================
    3. LOCAL MATH
    ============================================================
    */

    if (
        isMathQuestion(
            input
        )
    ) {

        const result =
            solveMath(
                input
            );


        if (
            result !== null
        ) {

            lastSource =
                "local-math";


            console.log(
                "[CrazeMind] LOCAL MATH"
            );


            return makeAnswer(

                "## Answer\n\n" +
                `**${result}**`,

                "local-math"
            );
        }
    }


    /*
    ============================================================
    4. LOCAL KNOWLEDGE
    ============================================================
    */

    const localAnswer =
        localConversation(
            input
        );


    if (
        localAnswer
    ) {

        lastSource =
            "local-knowledge";


        console.log(
            "[CrazeMind] LOCAL KNOWLEDGE"
        );


        /*
            Save local knowledge.
        */

        try {

            await learn(
                input,
                localAnswer
            );

        } catch (error) {

            console.warn(
                "[CrazeMind] Could not save local knowledge:",
                error
            );
        }


        return makeAnswer(
            localAnswer,
            "local-knowledge"
        );
    }


    /*
    ============================================================
    5. GEMINI FALLBACK
    ============================================================
    */

    console.log(
        "[CrazeMind] LOCAL BRAIN NOT FOUND"
    );


    if (
        !GEMINI_API_KEY
    ) {

        lastSource =
            "unavailable";


        return makeAnswer(

            "## I couldn't generate an answer\n\n" +

            "CrazeMind could not find an answer " +
            "in its local brain, and the Gemini API " +
            "is not configured.\n\n" +

            "Add `GEMINI_API_KEY` to " +
            "`window.CRAZEMIND_CONFIG` to enable " +
            "Gemini fallback.",

            "unavailable"
        );
    }


    try {

        lastSource =
            "gemini";


        console.log(
            "[CrazeMind] GEMINI FALLBACK"
        );


        const geminiAnswer =
            await askGemini(
                input
            );


        /*
            Save Gemini answer into local memory.

            This means the next time the same
            question is asked, local memory can
            answer it without Gemini.
        */

        try {

            await learn(
                input,
                geminiAnswer
            );


            console.log(
                "[CrazeMind] GEMINI ANSWER SAVED"
            );

        } catch (error) {

            console.warn(
                "[CrazeMind] Could not save Gemini answer:",
                error
            );
        }


        return makeAnswer(
            geminiAnswer,
            "gemini"
        );

    } catch (error) {

        lastSource =
            "gemini-error";


        console.error(
            "[CrazeMind] Gemini error:",
            error
        );


        return makeAnswer(

            "## I couldn't generate an answer\n\n" +

            "CrazeMind could not find an answer " +
            "locally and Gemini could not generate one.\n\n" +

            "**Error:** `" +

            String(
                error?.message ||
                error ||
                "Unknown Gemini error"
            )
                .replace(
                    /`/g,
                    "'"
                ) +

            "`",

            "gemini-error"
        );
    }
}


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {

    answerQuestion,

    askGemini,

    solveMath,

    localConversation,

    getLastAnswerSource

};
