/*
============================================================
CrazeMind Brain
CrazeStudio
============================================================

Priority:

1. Commands
2. Local memory
3. Local reasoning
4. Math engine
5. Gemini fallback

Gemini is NOT used for every question.
============================================================
*/

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
   BASIC HELPERS
============================================================ */

function clean(text) {
    return String(text || "")
        .trim()
        .toLowerCase();
}


/* ============================================================
   LOCAL MATH ENGINE
============================================================ */

function solveMath(input) {

    let expression =
        String(input || "")
            .trim();

    /*
    Remove common natural-language prefixes.
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
    Convert common math symbols.
    */

    expression =
        expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/−/g, "-")
            .replace(/π/gi, "Math.PI");


    /*
    Allow only a safe mathematical character set.
    */

    if (
        !/^[0-9+\-*/().%\s^MathPI]+$/i.test(
            expression
        )
    ) {
        return null;
    }


    /*
    Don't evaluate suspicious JavaScript.
    */

    if (
        /(?:constructor|window|document|globalThis|eval|function|=>)/i
            .test(expression)
    ) {
        return null;
    }


    try {

        /*
        Exponent operator.
        */

        expression =
            expression.replace(
                /\^/g,
                "**"
            );


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
   DETECT MATH
============================================================ */

function isMathQuestion(input) {

    const text =
        String(input || "")
            .trim();


    if (
        !text
    ) {
        return false;
    }


    /*
    Examples:

    25 + 50
    293 * 847
    what is 50 × 20
    calculate 25^2
    */

    return (
        /^(calculate|solve|what\s+is|what's)?\s*[-+*/().%\d\s×÷−^]+[?]?$/i
            .test(text)
    );
}


/* ============================================================
   LOCAL CONVERSATION BRAIN
============================================================ */

function localConversation(
    input
) {

    const text =
        clean(input);


    if (
        /^(hello|hi|hey|yo|hii|helo)$/.test(
            text
        )
    ) {

        return (
            "Hello! I'm **CrazeMind**, created by **CrazeStudio**. " +
            "How can I help?"
        );
    }


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
            "I'm **CrazeMind**, an AI project created by **CrazeStudio**."
        );
    }


    if (
        text === "what is crazemind"
    ) {

        return (
            "## CrazeMind\n\n" +
            "CrazeMind is an AI project created by **CrazeStudio**. " +
            "It uses local memory, local reasoning, training data, " +
            "and optional AI fallback."
        );
    }


    if (
        text === "what is ai" ||
        text ===
            "what is artificial intelligence"
    ) {

        return (
            "## Artificial Intelligence\n\n" +
            "Artificial intelligence (AI) is the field of " +
            "creating computer systems that can perform tasks " +
            "that normally require human intelligence."
        );
    }


    if (
        text === "what is html"
    ) {

        return (
            "## HTML\n\n" +
            "HTML stands for **HyperText Markup Language**. " +
            "It provides the structure of web pages."
        );
    }


    if (
        text === "what is css"
    ) {

        return (
            "## CSS\n\n" +
            "CSS stands for **Cascading Style Sheets**. " +
            "It controls the appearance and layout of web pages."
        );
    }


    if (
        text === "what is javascript"
    ) {

        return (
            "## JavaScript\n\n" +
            "JavaScript is a programming language commonly " +
            "used to create interactive websites and applications."
        );
    }


    if (
        text === "what is python"
    ) {

        return (
            "## Python\n\n" +
            "Python is a high-level programming language " +
            "known for its readable syntax."
        );
    }


    return null;
}


/* ============================================================
   GEMINI FALLBACK
============================================================ */

async function askGemini(
    question
) {

    const response =
        await fetch(
            "/api/gemini",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        prompt:
                            question
                    })
            }
        );


    const text =
        await response.text();


    if (
        !response.ok
    ) {

        let message =
            text ||
            "Gemini request failed.";


        try {

            const data =
                JSON.parse(
                    text
                );


            message =
                data.details ||
                data.error ||
                message;

        } catch {}


        throw new Error(
            message
        );
    }


    const data =
        JSON.parse(
            text
        );


    if (
        !data.answer
    ) {

        throw new Error(
            "Gemini returned no answer."
        );
    }


    return String(
        data.answer
    ).trim();
}


/* ============================================================
   /SEARCH
============================================================ */

async function handleSearch(
    input
) {

    const query =
        input
            .slice(7)
            .trim();


    if (!query) {

        return (
            "Usage: `/search your query`"
        );
    }


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
            .slice(6)
            .trim()
            .toLowerCase();


    let amount;


    if (
        argument === "full" ||
        argument === "all" ||
        argument === "0"
    ) {

        amount = 0;

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

            amount = 100;
        }
    }


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

    await clearTraining();


    return (
        "## Memory Cleared\n\n" +
        "CrazeMind's local training memory has been cleared."
    );
}


/* ============================================================
   /DOWNLOAD
============================================================ */

async function handleDownload() {

    await downloadWeights();


    return (
        "Training data exported as `crazemind-training.json`."
    );
}


/* ============================================================
   COMMAND HANDLER
============================================================ */

async function handleCommand(
    input
) {

    const lower =
        clean(input);


    if (
        lower.startsWith(
            "/search"
        )
    ) {

        return await handleSearch(
            input
        );
    }


    if (
        lower.startsWith(
            "/train"
        )
    ) {

        return await handleTrain(
            input
        );
    }


    if (
        lower ===
        "/stats"
    ) {

        return await handleStats();
    }


    if (
        lower ===
        "/clear"
    ) {

        return await handleClear();
    }


    if (
        lower ===
        "/download"
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


    if (!input) {

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
        input.startsWith("/")
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

            console.log(
                "[CrazeMind] ✓ Local memory"
            );


            return remembered;
        }

    } catch (error) {

        console.warn(
            "[CrazeMind] Memory error:",
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

            console.log(
                "[CrazeMind] ✓ Local math engine"
            );


            return (
                `## Answer\n\n` +
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

        console.log(
            "[CrazeMind] ✓ Local reasoning"
        );


        return localAnswer;
    }


    /*
    ============================================================
    5. GEMINI FALLBACK
    ============================================================
    */

    if (
        options.useAI === false
    ) {

        return (
            "I couldn't find that in my local brain."
        );
    }


    console.log(
        "[CrazeMind] → Gemini fallback"
    );


    try {

        const answer =
            await askGemini(
                input
            );


        /*
        Save Gemini's answer so that
        CrazeMind can recall it later.
        */

        try {

            await learn(
                input,
                answer
            );

        } catch (error) {

            console.warn(
                "[CrazeMind] Could not save AI answer:",
                error
            );
        }


        return answer;

    } catch (error) {

        console.error(
            "[CrazeMind] Gemini error:",
            error
        );


        return (
            "## Not found\n\n" +

            "I couldn't find an answer in my " +
            "local CrazeMind brain.\n\n" +

            "Gemini fallback is currently unavailable."
        );
    }
}


/* ============================================================
   EXPORTS
============================================================ */

export {
    askGemini,
    solveMath,
    localConversation
};


export default {
    answerQuestion,
    askGemini,
    solveMath,
    localConversation
};