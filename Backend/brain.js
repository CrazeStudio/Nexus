/*
    CrazeMind Brain
    Brand: CrazeStudio

    Commands:
    /search <query>
    /wiki <query>
    /math <expression>
    /ask <question>
    /train <amount>
    /help
    /about
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
   Utilities
========================================================= */

function clean(text) {

    return String(text)
        .replace(/\s+/g, " ")
        .trim();
}


function commandParts(input) {

    const parts =
        input.trim().split(/\s+/);

    const command =
        parts[0].toLowerCase();

    const query =
        parts.slice(1).join(" ").trim();

    return {
        command,
        query
    };
}


/* =========================================================
   Search
========================================================= */

async function searchWeb(query) {

    if (!query) {

        return {
            answer:
                "Usage: /search <query>",

            sources: []
        };
    }


    const [
        wikipedia,
        duckduckgo
    ] =
        await Promise.all([

            wikipediaSearch(query),

            duckSearch(query)
        ]);


    if (
        wikipedia &&
        wikipedia.text
    ) {

        let answer =
            wikipedia.text;


        if (
            duckduckgo &&
            duckduckgo.text &&
            duckduckgo.text !==
                wikipedia.text
        ) {

            answer +=
                "\n\nDuckDuckGo:\n" +
                duckduckgo.text;
        }


        return {

            answer:
                clean(answer),

            sources: [
                "Wikipedia",
                "DuckDuckGo"
            ]
        };
    }


    if (
        duckduckgo &&
        duckduckgo.text
    ) {

        return {

            answer:
                clean(
                    duckduckgo.text
                ),

            sources:
                ["DuckDuckGo"]
        };
    }


    return {

        answer:
            "I couldn't find anything for: " +
            query,

        sources: []
    };
}


/* =========================================================
   Wikipedia only
========================================================= */

async function searchWikipedia(query) {

    if (!query) {

        return {

            answer:
                "Usage: /wiki <topic>",

            sources: []
        };
    }


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
                clean(
                    result.text
                ),

            sources:
                ["Wikipedia"]
        };
    }


    return {

        answer:
            "Wikipedia couldn't find: " +
            query,

        sources: []
    };
}


/* =========================================================
   Math command
========================================================= */

function mathCommand(query) {

    if (!query) {

        return {

            answer:
                "Usage: /math <expression>",

            sources: []
        };
    }


    const result =
        solveMath(query);


    if (result) {

        return {

            answer:
                result,

            sources:
                ["CrazeMind Math Engine"]
        };
    }


    return {

        answer:
            "I couldn't solve that expression.",

        sources: []
    };
}


/* =========================================================
   Help
========================================================= */

function helpCommand() {

    return {

        answer:
`CrazeMind commands:

/search <query>
Search Wikipedia and DuckDuckGo.

/wiki <topic>
Search Wikipedia only.

/math <expression>
Solve a mathematical expression.

/ask <question>
Ask CrazeMind normally.

/train <amount>
Train CrazeMind using the configured trainer.

/about
Show information about CrazeMind.

/help
Show this command list.

Examples:

/search Albert Einstein
/wiki JavaScript
/math 2^50
/math sqrt(144)
/math derivative x^3
/ask explain black holes
/train 100`,

        sources: []
    };
}


/* =========================================================
   About
========================================================= */

function aboutCommand() {

    return {

        answer:
`CrazeMind

Brand: CrazeStudio
Creator: CrazeStudio
Architecture: Browser-based AI
Knowledge: Wikipedia + DuckDuckGo
Math: Math.js
Training: Llama-instruct dataset
Language model: CrazeMind Transformer

Status:
${model.trained ? "Trained" : "Not trained"}`,

        sources: []
    };
}


/* =========================================================
   Training command
========================================================= */

async function trainingCommand(query) {

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
                "CrazeMind training finished.\n\n" +
                "Examples: " +
                amount,

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
                "CrazeMind training finished.\n\n" +
                "Examples: " +
                amount,

            sources:
                ["CrazeMind Trainer"],

            training:
                result
        };
    }


    return {

        answer:
            "The trainer is not available.",

        sources: []
    };
}


/* =========================================================
   Commands
========================================================= */

async function executeCommand(input) {

    const {
        command,
        query
    } =
        commandParts(input);


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
                    `Unknown command: ${command}

Type /help to see available commands.`,

                sources: []
            };
    }
}


/* =========================================================
   Detect normal math questions
========================================================= */

function isMathQuestion(question) {

    const q =
        question.toLowerCase();


    return (
        /[\d+\-*/^=]/.test(q) ||
        q.includes("calculate") ||
        q.includes("solve") ||
        q.includes("simplify") ||
        q.includes("derivative") ||
        q.includes("differentiate") ||
        q.includes("factor") ||
        q.includes("equation") ||
        q.includes("probability") ||
        q.includes("sqrt") ||
        q.includes("sin") ||
        q.includes("cos") ||
        q.includes("tan") ||
        q.includes("log")
    );
}


/* =========================================================
   Knowledge detection
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
   Neural model
========================================================= */

function neuralAnswer(question) {

    try {

        const tokens =
            tokenizer.encode(
                question
            );


        if (!tokens.length) {
            return null;
        }


        brain.forward(
            tokens
        );


        if (!model.trained) {
            return null;
        }


        const generated =
            model.generate(
                question,
                tokenizer,
                100,
                0.7
            );


        if (
            !generated ||
            !generated.trim()
        ) {

            return null;
        }


        return generated;

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
        String(
            question || ""
        ).trim();


    if (!question) {

        return {

            answer:
                "Please ask me something.",

            sources: []
        };
    }


    /*
        Commands always have priority.
    */

    if (
        question.startsWith("/")
    ) {

        return await executeCommand(
            question
        );
    }


    /*
        Basic + math.
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
                isMathQuestion(question)
                    ? ["CrazeMind Math Engine"]
                    : ["CrazeMind Basic Engine"]
        };
    }


    /*
        Trained model.
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
        Web knowledge.
    */

    if (
        needsKnowledge(
            question
        )
    ) {

        try {

            const [
                wikipedia,
                duckduckgo
            ] =
                await Promise.all([

                    wikipediaSearch(
                        question
                    ),

                    duckSearch(
                        question
                    )
                ]);


            if (
                wikipedia &&
                wikipedia.text
            ) {

                return {

                    answer:
                        clean(
                            wikipedia.text
                        ),

                    sources:
                        ["Wikipedia"]
                };
            }


            if (
                duckduckgo &&
                duckduckgo.text
            ) {

                return {

                    answer:
                        clean(
                            duckduckgo.text
                        ),

                    sources:
                        ["DuckDuckGo"]
                };
            }

        } catch (error) {

            console.error(
                "Search error:",
                error
            );
        }
    }


    return {

        answer:
            "I don't know that yet. " +
            "Try /search, /wiki, /math, /ask, " +
            "or /help.",

        sources: []
    };
}


/* =========================================================
   Public training API
========================================================= */

export async function trainAI(
    amount = 100
) {

    return await trainingCommand(
        String(amount)
    );
}


/* =========================================================
   AI information
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
            model.trained
    };
}


/* =========================================================
   Browser API
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