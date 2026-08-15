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
Netlify Function
  ↓
Gemini API
  ↓
Save Gemini answer to local memory

IMPORTANT:

The Gemini API key is NEVER stored in this file.

The browser calls:

/.netlify/functions/gemini

The Netlify Function reads:

GEMINI_API_KEY

from the Netlify environment.

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
    Netlify Function endpoint.

    If the site is:

    https://crazestudio.netlify.app

    the browser calls:

    https://crazestudio.netlify.app/.netlify/functions/gemini

    Using a relative URL also works with custom domains.
*/

const GEMINI_ENDPOINT =
    "/.netlify/functions/gemini";


/*
    Stable Gemini model.

    The actual Gemini API call is performed
    by the Netlify Function.
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
   CREATE ANSWER OBJECT
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

export function solveMath(
    input
) {

    let expression =
        String(
            input || ""
        ).trim();


    /*
        Remove common natural-language prefixes.
    */

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


    /*
        Mathematical symbols.
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
            /*
                Replace π with its numeric value.

                Do NOT replace it with Math.PI,
                because the security whitelist below
                intentionally does not allow property access.
            */
            .replace(
                /π/gi,
                String(
                    Math.PI
                )
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
        Only mathematical characters are allowed.

        This prevents arbitrary JavaScript from being
        executed through the calculator.
    */

    if (
        !/^[0-9+\-*/().%\s^]+$/.test(
            expression
        )
    ) {

        return null;
    }


    /*
        Convert ^ to JavaScript exponentiation.
    */

    expression =
        expression.replace(
            /\^/g,
            "**"
        );


    /*
        Calculate.
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


    /*
        /math is handled separately.
    */

    if (
        /^\/math(?:\s|$)/i.test(
            text
        )
    ) {

        return true;
    }


    /*
        Natural math questions.
    */

    return (
        /^(calculate|solve|what\s+is|what's)?\s*[-+*/().%\d\s×÷−^π]+[?]?$/i
            .test(
                text
            )
    );
}


/* ============================================================
   EXTRACT MATH EXPRESSION
============================================================ */

function extractMathExpression(
    input
) {

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
            "local reasoning, and a Gemini fallback " +
            "through a secure Netlify Function."
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


    /* --------------------------------------------------------
       Netlify
    -------------------------------------------------------- */

    if (
        text ===
        "what is netlify"
    ) {

        return (
            "## Netlify\n\n" +

            "Netlify is a platform for deploying " +
            "websites, serverless functions, and " +
            "modern web applications."
        );
    }


    return null;
}


/* ============================================================
   GEMINI API
============================================================ */

/*
    IMPORTANT:

    This function does NOT contain an API key.

    It sends the question to the Netlify Function.

    The Netlify Function contains the secure
    environment-variable access.
*/

export async function askGemini(
    question
) {

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


    /*
        Call Netlify Function.
    */

    try {

        response =
            await fetch(
                GEMINI_ENDPOINT,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
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

            "Could not connect to the " +
            "CrazeMind Gemini server: " +

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

            "CrazeMind server returned " +
            "invalid JSON."

        );
    }


    /*
        HTTP error.
    */

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


    /*
        Extract answer.

        The Netlify Function returns:

        {
            answer,
            model,
            source
        }
    */

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
   /HELP
============================================================ */

function handleHelp() {

    lastSource =
        "local";


    return (

        "## CrazeMind Commands\n\n" +

        "`/search query` — Search the web\n\n" +

        "`/math expression` — Calculate math\n\n" +

        "`/train 100` — Train on 100 examples\n\n" +

        "`/train full` — Train on the full dataset\n\n" +

        "`/stats` — Show training statistics\n\n" +

        "`/download` — Export training data\n\n" +

        "`/clear` — Clear training memory\n\n" +

        "Normal questions are answered using " +
        "local knowledge/memory first and Gemini " +
        "as the fallback."

    );
}


/* ============================================================
   /ABOUT
============================================================ */

function handleAbout() {

    lastSource =
        "local";


    return (

        "## CrazeMind\n\n" +

        "**CrazeMind** is an AI project by " +
        "**CrazeStudio**.\n\n" +

        "It combines local memory, local knowledge, " +
        "math, training, search, and Gemini fallback " +
        "through a Netlify serverless function."

    );
}


/* ============================================================
   /MATH
============================================================ */

function handleMath(
    input
) {

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
   /WIKI
============================================================ */

async function handleWiki(
    input
) {

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


    /*
        Use search.js if it supports web search.
    */

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
            "No Wikipedia/search results found."
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
            "No Wikipedia results found."
        );
    }
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


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       WIKI
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       MATH
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       TRAIN
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       STATS
    -------------------------------------------------------- */

    if (
        lower === "/stats"
    ) {

        return await handleStats();
    }


    /* --------------------------------------------------------
       CLEAR
    -------------------------------------------------------- */

    if (
        lower === "/clear"
    ) {

        return await handleClear();
    }


    /* --------------------------------------------------------
       DOWNLOAD
    -------------------------------------------------------- */

    if (
        lower === "/download"
    ) {

        return await handleDownload();
    }


    /* --------------------------------------------------------
       HELP
    -------------------------------------------------------- */

    if (
        lower === "/help"
    ) {

        return handleHelp();
    }


    /* --------------------------------------------------------
       ABOUT
    -------------------------------------------------------- */

    if (
        lower === "/about"
    ) {

        return handleAbout();
    }


    /*
        Unknown slash command.

        Do not silently send an unknown command
        to Gemini.
    */

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


    /*
        Reset source.
    */

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
       1. COMMANDS
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
       2. LOCAL MEMORY
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


            console.log(
                "[CrazeMind] LOCAL MEMORY"
            );


            return makeAnswer(
                remembered,
                "local-memory"
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "[CrazeMind] Local memory error:",
            error
        );
    }


    /* ========================================================
       3. LOCAL MATH
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


    /* ========================================================
       4. LOCAL KNOWLEDGE
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


        console.log(
            "[CrazeMind] LOCAL KNOWLEDGE"
        );


        /*
            Save local answer to memory.
        */

        try {

            await learn(
                input,
                localAnswer
            );

        } catch (
            error
        ) {

            console.warn(
                "[CrazeMind] Could not save local answer:",
                error
            );
        }


        return makeAnswer(
            localAnswer,
            "local-knowledge"
        );
    }


    /* ========================================================
       5. GEMINI FALLBACK
    ======================================================== */

    try {

        console.log(
            "[CrazeMind] GEMINI FALLBACK"
        );


        const result =
            await askGemini(
                input
            );


        const answer =
            result?.answer ||
            "";


        if (
            !answer.trim()
        ) {

            throw new Error(
                "Gemini returned an empty answer."
            );
        }


        lastSource =
            "Gemini";


        /*
            Save Gemini answer to local memory.

            This means the next time a similar
            question is asked, CrazeMind may answer
            from local memory instead of calling Gemini.
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
                "[CrazeMind] Could not save Gemini answer:",
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

            "**Reason:** `" +

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
