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

/*
    Expected config file:

    Frontend/config/gemini-config.js

    It should create:

    window.CRAZEMIND_CONFIG = {
        GEMINI_API_KEY: "..."
    };
*/

const GEMINI_API_KEY =
    typeof window !== "undefined"
        ? String(
            window
                ?.CRAZEMIND_CONFIG
                ?.GEMINI_API_KEY ||
            ""
        ).trim()
        : "";


/*
    Gemini model.
*/

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

function normalize(
    text
) {

    return String(
        text || ""
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


/* ============================================================
   LOCAL MATH
============================================================ */

export function solveMath(
    input
) {

    let expression =
        String(
            input || ""
        ).trim();


    /*
        Remove natural language.
    */

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


    /*
        Math symbols.
    */

    expression =
        expression
            .replace(
                /×/g,
                "*"
            )
            .replace(
                /÷/g,
                "/"
            )
            .replace(
                /−/g,
                "-"
            )
            .replace(
                /π/gi,
                "Math.PI"
            );


    /*
        Empty expression.
    */

    if (
        !expression
    ) {

        return null;
    }


    /*
        Only allow mathematical characters.

        This prevents arbitrary JavaScript from
        being executed through the calculator.
    */

    if (
        !/^[0-9+\-*/().%\s^]+$/.test(
            expression
        )
    ) {

        return null;
    }


    /*
        Exponent.
    */

    expression =
        expression.replace(
            /\^/g,
            "**"
        );


    /*
        Evaluate mathematical expression.
    */

    try {

        const result =
            Function(
                `"use strict"; return (${expression})`
            )();


        if (
            typeof result !==
            "number"
        ) {

            return null;
        }


        if (
            !Number.isFinite(
                result
            )
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

function isMathQuestion(
    input
) {

    const text =
        String(
            input || ""
        ).trim();


    if (
        !text
    ) {

        return false;
    }


    return (
        /^(calculate|solve|what\s+is|what's)?\s*[-+*/().%\d\s×÷−^]+[?]?$/i
            .test(
                text
            )
    );
}


/* ============================================================
   LOCAL KNOWLEDGE
============================================================ */

export function localConversation(
    input
) {

    const text =
        normalize(
            input
        );


    /* --------------------------------------------------------
       Greetings
       -------------------------------------------------------- */

    if (
        /^(hello|hi|hey|hii|helo|yo)$/
            .test(
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
        text.includes(
            "who created you"
        ) ||
        text.includes(
            "who made you"
        ) ||
        text.includes(
            "who built you"
        )
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
        text ===
        "what is crazemind"
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
        text ===
        "what is ai" ||
        text ===
        "what is artificial intelligence"
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
        text ===
        "what is html"
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
        text ===
        "what is css"
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
        text ===
        "what is javascript"
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
        text ===
        "what is python"
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

export async function askGemini(
    question
) {

    /*
        Check API key.
    */

    if (
        !GEMINI_API_KEY
    ) {

        throw new Error(
            "Gemini API key is not configured."
        );
    }


    /*
        Gemini endpoint.
    */

    const endpoint =
        "https://generativelanguage.googleapis.com/" +
        "v1beta/models/" +
        GEMINI_MODEL +
        ":generateContent";


    let response;


    /*
        Send request.
    */

    try {

        response =
            await fetch(
                endpoint,
                {

                    method:
                        "POST",

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

                                    role:
                                        "user",

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

    } catch (
        error
    ) {

        throw new Error(
            "Network error while contacting Gemini: " +
            (
                error?.message ||
                String(error)
            )
        );
    }


    /*
        Read response.
    */

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


    /*
        HTTP error.
    */

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


    /*
        Extract generated text.
    */

    const answer =
        data
            ?.candidates?.[0]
            ?.content
            ?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            .join("")
            .trim();


    /*
        No answer.
    */

    if (
        !answer
    ) {

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

async function handleSearch(
    input
) {

    const query =
        input
            .slice(
                "/search".length
            )
            .trim();


    if (
        !query
    ) {

        return (
            "Usage: `/search your query`"
        );
    }


    lastSource =
        "search";


    return await searchText(
        query
    );
}


/* ============================================================
   /TRAIN
============================================================ */

async function handleTrain(
    input
) {

    const argument =
        input
            .slice(
                "/train".length
            )
            .trim()
            .toLowerCase();


    let amount;


    /*
        0/full/all = full dataset.
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
            !Number.isFinite(
                amount
            ) ||
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


                        /*
                            Let the frontend
                            display training progress.
                        */

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


    return (

        "## Training Complete\n\n" +

        `- Dataset: \`${result.dataset}\`\n` +

        `- Rows processed: **${result.datasetRows}**\n` +

        `- Examples stored: **${result.trainedExamples}**\n` +

        `- Mode: **${result.mode}**`
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


    return (

        "## CrazeMind Brain\n\n" +

        `- Stored examples: **${stats.examples}**\n` +

        `- Dataset: \`${stats.dataset}\`\n` +

        `- Mode: **${stats.mode}**`
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


    if (
        success
    ) {

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

async function handleCommand(
    input
) {

    const lower =
        normalize(
            input
        );


    /*
        /search
    */

    if (
        lower === "/search" ||
        lower.startsWith(
            "/search "
        )
    ) {

        return await handleSearch(
            input
        );
    }


    /*
        /train
    */

    if (
        lower === "/train" ||
        lower.startsWith(
            "/train "
        )
    ) {

        return await handleTrain(
            input
        );
    }


    /*
        /stats
    */

    if (
        lower === "/stats"
    ) {

        return await handleStats();
    }


    /*
        /clear
    */

    if (
        lower === "/clear"
    ) {

        return await handleClear();
    }


    /*
        /download
    */

    if (
        lower === "/download"
    ) {

        return await handleDownload();
    }


    /*
        Unknown command.
    */

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
        Empty question.
    */

    if (
        !input
    ) {

        return (
            "Please ask me something."
        );
    }


    /*
    ============================================================
    1. COMMANDS
    ============================================================
    */

    if (
        input.startsWith(
            "/"
        )
    ) {

        const commandResult =
            await handleCommand(
                input
            );


        if (
            commandResult !== null
        ) {

            return commandResult;
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


            return remembered;
        }

    } catch (
        error
    ) {

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


            return (

                "## Answer\n\n" +

                `**${result}**`
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
            Save built-in knowledge too.
        */

        try {

            await learn(
                input,
                localAnswer
            );

        } catch {
            // Don't stop answer if memory save fails.
        }


        return localAnswer;
    }


    /*
    ============================================================
    5. AI DISABLED
    ============================================================
    */

    if (
        options.useAI === false
    ) {

        lastSource =
            "not-found";


        return (

            "## Not found\n\n" +

            "I don't know that yet."
        );
    }


    /*
    ============================================================
    6. GEMINI FALLBACK
    ============================================================
    */

    console.log(
        "[CrazeMind] LOCAL BRAIN FAILED → GEMINI"
    );


    try {

        const aiAnswer =
            await askGemini(
                input
            );


        lastSource =
            "gemini";


        /*
        ========================================================
        SAVE GEMINI ANSWER
        ========================================================
        */

        try {

            await learn(
                input,
                aiAnswer
            );


            console.log(
                "[CrazeMind] Gemini answer saved."
            );

        } catch (
            memoryError
        ) {

            console.warn(
                "[CrazeMind] Could not save Gemini answer:",
                memoryError
            );
        }


        return aiAnswer;

    } catch (
        error
    ) {

        lastSource =
            "error";


        console.error(
            "[CrazeMind] Gemini fallback error:",
            error
        );


        return (

            "## I couldn't answer that\n\n" +

            "I couldn't find the answer in " +
            "CrazeMind's local brain.\n\n" +

            `**Gemini error:** ${
                error?.message ||
                String(error) ||
                "Unknown error"
            }`
        );
    }
}


/* ============================================================
   EXPORTS
============================================================ */

export default {

    answerQuestion,

    askGemini,

    solveMath,

    localConversation,

    getLastAnswerSource
};
