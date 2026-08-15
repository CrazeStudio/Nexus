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
Local memory
  ↓
Local math
  ↓
Local knowledge
  ↓
Netlify Function
  ↓
Gemini API
  ↓
Save Gemini answer to local memory

IMPORTANT:
The Gemini API key is NEVER stored in this file.

The key exists only as:

GEMINI_API_KEY

inside Netlify Environment Variables.

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
   Netlify Function.

   IMPORTANT:
   This works when the website itself is deployed on Netlify.

   Function:
   netlify/functions/gemini.js

   URL:
   /.netlify/functions/gemini
*/

const GEMINI_ENDPOINT =
    "/.netlify/functions/gemini";


const GEMINI_MODEL =
    "gemini-2.5-flash";


/* ============================================================
   STATE
============================================================ */

let lastSource =
    "local";


/* ============================================================
   SOURCE
============================================================ */

export function getLastAnswerSource() {

    return lastSource;
}


/* ============================================================
   NORMALIZE
============================================================ */

function normalize(text) {

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
   ANSWER OBJECT
============================================================ */

function makeAnswer(
    answer,
    source = lastSource,
    sources = null
) {

    const text =
        String(
            answer ?? ""
        );


    let sourceList;


    if (
        Array.isArray(
            sources
        )
    ) {

        sourceList =
            sources;

    } else if (
        source
    ) {

        sourceList =
            [source];

    } else {

        sourceList =
            [];
    }


    return {

        answer:
            text,

        sources:
            sourceList

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
                /^(calculate|solve|what\s+is|what's)\s+/i,
                ""
            )
            .replace(
                /\?+$/,
                ""
            )
            .trim();


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
                String(
                    Math.PI
                )
            );


    if (
        !expression
    ) {

        return null;
    }


    /*
       Security:
       Only mathematical characters are accepted.
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

function isMathQuestion(input) {

    const text =
        String(
            input || ""
        ).trim();


    if (
        !text
    ) {

        return false;
    }


    if (
        /^\/math(?:\s|$)/i.test(
            text
        )
    ) {

        return true;
    }


    return (
        /^(calculate|solve|what\s+is|what's)?\s*[-+*/().%\d\s×÷−^π]+[?]?$/i
            .test(
                text
            )
    );
}


/* ============================================================
   MATH EXPRESSION
============================================================ */

function extractMathExpression(input) {

    return String(
        input || ""
    )
        .replace(
            /^\/math\s*/i,
            ""
        )
        .trim();
}


/* ============================================================
   LOCAL KNOWLEDGE
============================================================ */

export function localConversation(input) {

    const text =
        normalize(
            input
        );


    /* ========================================================
       GREETINGS
    ======================================================== */

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


    /* ========================================================
       CREATOR
    ======================================================== */

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


    /* ========================================================
       CRAZEMIND
    ======================================================== */

    if (
        text ===
        "what is crazemind"
    ) {

        return (
            "## CrazeMind\n\n" +

            "CrazeMind is an AI project created " +
            "by **CrazeStudio**.\n\n" +

            "It combines local memory, local " +
            "knowledge, math, training, search, " +
            "and Gemini through a Netlify Function."
        );
    }


    /* ========================================================
       AI
    ======================================================== */

    if (
        text === "what is ai" ||
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


    /* ========================================================
       HTML
    ======================================================== */

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


    /* ========================================================
       CSS
    ======================================================== */

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


    /* ========================================================
       JAVASCRIPT
    ======================================================== */

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


    /* ========================================================
       PYTHON
    ======================================================== */

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
   GEMINI
============================================================ */

export async function askGemini(question) {

    const input =
        String(
            question || ""
        ).trim();


    if (
        !input
    ) {

        throw new Error(
            "No question provided."
        );
    }


    let response;


    /* ========================================================
       CALL NETLIFY FUNCTION
    ======================================================== */

    try {

        response =
            await fetch(
                GEMINI_ENDPOINT,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            question:
                                input

                        })

                }
            );

    } catch (
        error
    ) {

        throw new Error(

            "Could not connect to the Netlify " +
            "Gemini function. " +

            (
                error?.message ||
                String(error)
            )

        );
    }


    /* ========================================================
       READ RESPONSE
    ======================================================== */

    const raw =
        await response.text();


    /*
       IMPORTANT FIX:

       Previously the code immediately called
       JSON.parse(raw).

       If Netlify returned HTML such as a 404 page,
       this caused:

       "CrazeMind server returned invalid JSON."

       Now we detect that situation and provide
       a useful error.
    */

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    /* ========================================================
       NON-JSON RESPONSE
    ======================================================== */

    if (
        !contentType
            .toLowerCase()
            .includes(
                "application/json"
            )
    ) {

        const preview =
            raw
                .replace(
                    /\s+/g,
                    " "
                )
                .trim()
                .slice(
                    0,
                    300
                );


        if (
            response.status ===
            404
        ) {

            throw new Error(

                "Netlify Gemini function was not found " +
                "(HTTP 404).\n\n" +

                "Make sure this file exists:\n" +

                "netlify/functions/gemini.js\n\n" +

                "and that the site is deployed on Netlify."

            );
        }


        if (
            response.status >=
            500
        ) {

            throw new Error(

                `Netlify Gemini function returned ` +
                `HTTP ${response.status}.\n\n` +

                preview

            );
        }


        throw new Error(

            `Gemini server returned a non-JSON ` +
            `response (HTTP ${response.status}).\n\n` +

            preview

        );
    }


    /* ========================================================
       PARSE JSON
    ======================================================== */

    let data;


    try {

        data =
            JSON.parse(
                raw
            );

    } catch {

        throw new Error(

            "Gemini server returned invalid JSON.\n\n" +

            "Response:\n" +

            raw
                .slice(
                    0,
                    300
                )

        );
    }


    /* ========================================================
       HTTP ERROR
    ======================================================== */

    if (
        !response.ok
    ) {

        const details =
            data?.details ||
            data?.error ||
            `HTTP ${response.status}`;


        throw new Error(
            String(
                details
            )
        );
    }


    /* ========================================================
       ANSWER
    ======================================================== */

    const answer =
        String(
            data?.answer ||
            ""
        ).trim();


    if (
        !answer
    ) {

        throw new Error(
            "Gemini returned an empty answer."
        );
    }


    return {

        answer:
            answer,

        model:
            data?.model ||
            GEMINI_MODEL,

        source:
            data?.source ||
            "Gemini"

    };
}


/* ============================================================
   SEARCH
============================================================ */

async function handleSearch(input) {

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


    const result =
        await searchText(
            query
        );


    if (
        result === null ||
        result === undefined
    ) {

        return (
            "No results found."
        );
    }


    if (
        typeof result ===
        "string"
    ) {

        return result;
    }


    if (
        typeof result ===
        "object"
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

            return (
                "No results found."
            );
        }
    }


    return String(
        result
    );
}


/* ============================================================
   TRAIN
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
   STATS
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
   CLEAR
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
   DOWNLOAD
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
   HELP
============================================================ */

function handleHelp() {

    lastSource =
        "local";


    return (

        "## CrazeMind Commands\n\n" +

        "`/search query` — Search\n\n" +

        "`/math 2 + 2` — Calculate\n\n" +

        "`/train 100` — Train\n\n" +

        "`/train full` — Train full dataset\n\n" +

        "`/stats` — Training statistics\n\n" +

        "`/download` — Export training data\n\n" +

        "`/clear` — Clear training memory\n\n" +

        "`/about` — About CrazeMind"

    );
}


/* ============================================================
   ABOUT
============================================================ */

function handleAbout() {

    lastSource =
        "local";


    return (

        "## CrazeMind\n\n" +

        "**CrazeMind** is an AI project by " +
        "**CrazeStudio**.\n\n" +

        "It combines local memory, local knowledge, " +
        "math, training, search, and Gemini."

    );
}


/* ============================================================
   MATH COMMAND
============================================================ */

function handleMath(input) {

    const expression =
        extractMathExpression(
            input
        );


    if (
        !expression
    ) {

        lastSource =
            "local-math";


        return (
            "Usage: `/math 2 + 2`"
        );
    }


    const result =
        solveMath(
            expression
        );


    if (
        result === null
    ) {

        lastSource =
            "local-math";


        return (
            "I couldn't calculate that expression."
        );
    }


    lastSource =
        "local-math";


    return (

        "## Answer\n\n" +

        `**${result}**`

    );
}


/* ============================================================
   WIKI
============================================================ */

async function handleWiki(input) {

    const query =
        input
            .slice(
                "/wiki".length
            )
            .trim();


    if (
        !query
    ) {

        return (
            "Usage: `/wiki topic`"
        );
    }


    lastSource =
        "search";


    const result =
        await searchText(
            query
        );


    if (
        result === null ||
        result === undefined
    ) {

        return (
            "No results found."
        );
    }


    if (
        typeof result ===
        "string"
    ) {

        return result;
    }


    if (
        typeof result?.answer ===
        "string"
    ) {

        return result.answer;
    }


    if (
        typeof result?.text ===
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

        return (
            "No results found."
        );
    }
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
        lower.startsWith(
            "/search "
        )
    ) {

        return await handleSearch(
            input
        );
    }


    if (
        lower === "/wiki" ||
        lower.startsWith(
            "/wiki "
        )
    ) {

        return await handleWiki(
            input
        );
    }


    if (
        lower === "/math" ||
        lower.startsWith(
            "/math "
        )
    ) {

        return handleMath(
            input
        );
    }


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


    if (
        lower === "/help"
    ) {

        return handleHelp();
    }


    if (
        lower === "/about"
    ) {

        return handleAbout();
    }


    if (
        input.startsWith("/")
    ) {

        lastSource =
            "local";


        return (

            `Unknown command: \`${input}\`\n\n` +

            "Use `/help` to see available commands."

        );
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


    lastSource =
        "local";


    /* ========================================================
       EMPTY
    ======================================================== */

    if (
        !input
    ) {

        return makeAnswer(
            "Please ask me something.",
            "local"
        );
    }


    /* ========================================================
       COMMANDS
    ======================================================== */

    if (
        input.startsWith("/")
    ) {

        try {

            const commandResult =
                await handleCommand(
                    input
                );


            if (
                commandResult !==
                null
            ) {

                return makeAnswer(
                    commandResult,
                    lastSource
                );
            }

        } catch (
            error
        ) {

            console.error(
                "[CrazeMind] Command error:",
                error
            );


            lastSource =
                "command-error";


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


    /* ========================================================
       LOCAL MEMORY
    ======================================================== */

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


            return makeAnswer(
                remembered,
                "local-memory"
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "[CrazeMind] Memory error:",
            error
        );
    }


    /* ========================================================
       LOCAL MATH
    ======================================================== */

    if (
        isMathQuestion(
            input
        )
    ) {

        const expression =
            extractMathExpression(
                input
            );


        const result =
            solveMath(
                expression
            );


        if (
            result !== null
        ) {

            lastSource =
                "local-math";


            return makeAnswer(

                "## Answer\n\n" +
                `**${result}**`,

                "local-math"
            );
        }
    }


    /* ========================================================
       LOCAL KNOWLEDGE
    ======================================================== */

    const localAnswer =
        localConversation(
            input
        );


    if (
        localAnswer
    ) {

        lastSource =
            "local-knowledge";


        try {

            await learn(
                input,
                localAnswer
            );

        } catch (
            error
        ) {

            console.warn(
                "[CrazeMind] Memory save failed:",
                error
            );
        }


        return makeAnswer(
            localAnswer,
            "local-knowledge"
        );
    }


    /* ========================================================
       GEMINI FALLBACK
    ======================================================== */

    try {

        console.log(
            "[CrazeMind] Using Gemini fallback..."
        );


        const result =
            await askGemini(
                input
            );


        const answer =
            String(
                result?.answer ||
                ""
            ).trim();


        if (
            !answer
        ) {

            throw new Error(
                "Gemini returned an empty answer."
            );
        }


        lastSource =
            "Gemini";


        /*
           Save Gemini answer locally.
        */

        try {

            await learn(
                input,
                answer
            );

        } catch (
            error
        ) {

            console.warn(
                "[CrazeMind] Gemini memory save failed:",
                error
            );
        }


        return makeAnswer(
            answer,
            "Gemini"
        );

    } catch (
        error
    ) {

        console.error(
            "[CrazeMind] Gemini fallback failed:",
            error
        );


        lastSource =
            "error";


        return makeAnswer(

            "## I couldn't generate an answer\n\n" +

            "CrazeMind couldn't answer this locally, " +
            "and the Gemini fallback failed.\n\n" +

            "**Reason:**\n\n" +

            "```text\n" +

            String(
                error?.message ||
                error ||
                "Unknown error"
            ) +

            "\n```",

            "error"
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
