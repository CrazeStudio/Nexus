/*
============================================================
CrazeMind Brain
Brand: CrazeStudio
============================================================

Commands:

/train 100
/train 0
/export
/stats
/search something
/wiki something
/math expression
/help
/about

Normal questions are handled by the local trainer first,
then the model/basic fallback.
*/


/* ============================================================
   IMPORTS
============================================================ */

import {
    trainCrazeMind,
    downloadWeights,
    getTrainingStats,
    recall
} from "./trainer.js";


/* ============================================================
   OPTIONAL MODULES
============================================================ */

let searchModule = null;
let basicModule = null;
let modelModule = null;


/*
    Dynamic imports prevent the whole brain from crashing
    if one optional module has a different export.
*/

try {

    searchModule =
        await import(
            "./search.js"
        );

} catch (error) {

    console.warn(
        "CrazeMind search module unavailable:",
        error
    );
}


try {

    basicModule =
        await import(
            "./basic.js"
        );

} catch (error) {

    console.warn(
        "CrazeMind basic module unavailable:",
        error
    );
}


try {

    modelModule =
        await import(
            "./model.js"
        );

} catch (error) {

    console.warn(
        "CrazeMind model unavailable:",
        error
    );
}


/* ============================================================
   BRAND
============================================================ */

const AI_NAME =
    "CrazeMind";

const BRAND =
    "CrazeStudio";


/* ============================================================
   UTILITY
============================================================ */

function cleanCommand(
    text
) {

    return String(
        text || ""
    )
        .trim();
}


function getCommand(
    text
) {

    const value =
        cleanCommand(
            text
        );


    if (
        !value.startsWith("/")
    ) {

        return null;
    }


    const parts =
        value.split(
            /\s+/
        );


    return (
        parts[0]
            .slice(1)
            .toLowerCase()
    );
}


function getCommandArguments(
    text
) {

    const value =
        cleanCommand(
            text
        );


    const parts =
        value.split(
            /\s+/
        );


    parts.shift();


    return parts.join(
        " "
    ).trim();
}


/* ============================================================
   HELP
============================================================ */

function helpAnswer() {

    return `
# ${AI_NAME}

I'm **${AI_NAME}**, an AI project created by **${BRAND}**.

## Commands

| Command | Function |
|---|---|
| \`/train 100\` | Train using 100 Llama-Instruct examples |
| \`/train 0\` | Train using the whole available dataset |
| \`/export\` | Download learned training data |
| \`/stats\` | Show training statistics |
| \`/search query\` | Search the web |
| \`/wiki topic\` | Search Wikipedia |
| \`/math expression\` | Calculate an expression |
| \`/about\` | About CrazeMind |
| \`/help\` | Show this help |

You can also ask normal questions without a command.
`;
}


/* ============================================================
   ABOUT
============================================================ */

function aboutAnswer() {

    return `
# ${AI_NAME}

**Created by:** ${BRAND}

CrazeMind is a JavaScript-based AI project that combines:

- Local training data
- Llama-Instruct examples
- Persistent IndexedDB memory
- Web search
- Wikipedia
- Mathematics
- Local model generation
- Markdown responses

CrazeMind is **not Llama itself**. The Llama-Instruct dataset is used as training data.
`;
}


/* ============================================================
   MATH
============================================================ */

function calculateMath(
    expression
) {

    let exp =
        String(
            expression || ""
        ).trim();


    if (!exp) {

        return {
            answer:
                "Please provide a mathematical expression."
        };
    }


    /*
        Convert common notation.
    */

    exp =
        exp
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
                /\^/g,
                "**"
            );


    /*
        Remove common unsafe characters.

        Allowed:
        numbers
        operators
        parentheses
        decimal points
        spaces
    */

    if (
        !/^[0-9+\-*/%().\s*]+$/.test(
            exp
        )
    ) {

        return {

            answer:
                "I can only calculate standard mathematical expressions with `/math`."
        };
    }


    try {

        /*
            Function constructor is isolated here
            and only receives the validated expression.
        */

        const result =
            Function(
                `"use strict"; return (${exp})`
            )();


        if (
            typeof result !==
                "number" ||
            !Number.isFinite(
                result
            )
        ) {

            throw new Error(
                "Invalid result"
            );
        }


        return {

            answer:
                `## Result\n\n\`${result}\``
        };

    } catch {

        return {

            answer:
                "I couldn't calculate that expression."
        };
    }
}


/* ============================================================
   SEARCH
============================================================ */

async function performSearch(
    query
) {

    if (!query) {

        return {

            answer:
                "Usage: `/search your query`",

            sources: []
        };
    }


    if (
        !searchModule
    ) {

        return {

            answer:
                "The search module is not available.",

            sources: []
        };
    }


    /*
        Support several possible exports.
    */

    const searchFunction =
        searchModule.search ||
        searchModule.webSearch ||
        searchModule.searchWeb ||
        searchModule.default;


    if (
        typeof searchFunction !==
        "function"
    ) {

        return {

            answer:
                "The search module does not provide a search function.",

            sources: []
        };
    }


    const result =
        await searchFunction(
            query
        );


    /*
        If search.js already returns
        a formatted answer, use it.
    */

    if (
        typeof result ===
        "string"
    ) {

        return {

            answer:
                result,

            sources: []
        };
    }


    if (
        result &&
        typeof result ===
            "object"
    ) {

        return {

            answer:
                result.answer ||
                result.text ||
                result.content ||
                JSON.stringify(
                    result,
                    null,
                    2
                ),

            sources:
                result.sources ||
                result.urls ||
                []
        };
    }


    return {

        answer:
            "No search results were returned.",

        sources: []
    };
}


/* ============================================================
   WIKIPEDIA
============================================================ */

async function performWikipedia(
    query
) {

    if (!query) {

        return {

            answer:
                "Usage: `/wiki topic`",

            sources: []
        };
    }


    /*
        Try search.js first if it provides
        a Wikipedia function.
    */

    if (
        searchModule
    ) {

        const wikiFunction =
            searchModule.wikipedia ||
            searchModule.searchWikipedia ||
            searchModule.wiki;


        if (
            typeof wikiFunction ===
            "function"
        ) {

            try {

                const result =
                    await wikiFunction(
                        query
                    );


                if (
                    typeof result ===
                    "string"
                ) {

                    return {

                        answer:
                            result,

                        sources: []
                    };
                }


                if (
                    result &&
                    typeof result ===
                        "object"
                ) {

                    return {

                        answer:
                            result.answer ||
                            result.text ||
                            result.content ||
                            JSON.stringify(
                                result,
                                null,
                                2
                            ),

                        sources:
                            result.sources ||
                            result.urls ||
                            []
                    };
                }

            } catch (error) {

                console.warn(
                    "Wikipedia module failed:",
                    error
                );
            }
        }
    }


    /*
        Direct Wikipedia REST API fallback.
    */

    try {

        const encoded =
            encodeURIComponent(
                query
            );


        const url =
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;


        const response =
            await fetch(
                url
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `Wikipedia returned ${response.status}`
            );
        }


        const data =
            await response.json();


        const title =
            data.title ||
            query;


        const description =
            data.description ||
            "";


        const extract =
            data.extract ||
            "No Wikipedia summary was available.";


        const page =
            data.content_urls
                ?.desktop
                ?.page;


        return {

            answer:
                `# ${title}\n\n` +
                (
                    description
                        ? `*${description}*\n\n`
                        : ""
                ) +
                extract,

            sources:
                page
                    ? [page]
                    : []
        };

    } catch (error) {

        return {

            answer:
                `I couldn't retrieve Wikipedia information for **${query}**.\n\n` +
                `\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   MODEL ANSWER
============================================================ */

async function modelAnswer(
    question
) {

    if (
        !modelModule
    ) {

        return null;
    }


    /*
        Try common model export names.
    */

    const functions = [

        modelModule.generate,

        modelModule.generateText,

        modelModule.predict,

        modelModule.answer,

        modelModule.brain,

        modelModule.default

    ];


    for (
        const fn of functions
    ) {

        if (
            typeof fn !==
            "function"
        ) {

            continue;
        }


        try {

            const result =
                await fn(
                    question
                );


            if (
                typeof result ===
                "string" &&
                result.trim()
            ) {

                return result;
            }


            if (
                result &&
                typeof result ===
                    "object"
            ) {

                const answer =
                    result.answer ||
                    result.text ||
                    result.output ||
                    result.response;


                if (
                    typeof answer ===
                        "string" &&
                    answer.trim()
                ) {

                    return answer;
                }
            }

        } catch (error) {

            console.warn(
                "Model function failed:",
                error
            );
        }
    }


    return null;
}


/* ============================================================
   BASIC ANSWER
============================================================ */

async function basicAnswer(
    question
) {

    if (
        !basicModule
    ) {

        return null;
    }


    const functions = [

        basicModule.answer,

        basicModule.basicAnswer,

        basicModule.respond,

        basicModule.generate,

        basicModule.default

    ];


    for (
        const fn of functions
    ) {

        if (
            typeof fn !==
            "function"
        ) {

            continue;
        }


        try {

            const result =
                await fn(
                    question
                );


            if (
                typeof result ===
                "string" &&
                result.trim()
            ) {

                return result;
            }


            if (
                result &&
                typeof result ===
                    "object"
            ) {

                const answer =
                    result.answer ||
                    result.text ||
                    result.output;


                if (
                    typeof answer ===
                        "string"
                ) {

                    return answer;
                }
            }

        } catch (error) {

            console.warn(
                "Basic module failed:",
                error
            );
        }
    }


    return null;
}


/* ============================================================
   TRAIN
============================================================ */

async function trainCommand(
    argument
) {

    let amount =
        Number(
            argument
        );


    /*
        Empty /train means 20.
    */

    if (
        !argument
    ) {

        amount = 20;
    }


    if (
        !Number.isFinite(
            amount
        )
    ) {

        return {

            answer:
                "## Training Error\n\n" +
                "Use:\n\n" +
                "`/train 100`\n\n" +
                "or:\n\n" +
                "`/train 0` for the whole dataset.",

            sources: []
        };
    }


    if (
        amount < 0
    ) {

        return {

            answer:
                "## Training Error\n\n" +
                "The training amount cannot be negative.",

            sources: []
        };
    }


    try {

        const result =
            await trainCrazeMind(
                amount,
                {

                    onProgress:
                        progress => {

                            /*
                                This callback is intentionally
                                available for the frontend.

                                The UI can connect to it later.
                            */

                            console.log(
                                "CrazeMind training:",
                                progress
                            );
                        }
                }
            );


        const whole =
            result.wholeDataset;


        return {

            answer:
                whole

                    ? (
                        `# Training Complete\n\n` +
                        `CrazeMind trained on the **whole available dataset**.\n\n` +
                        `- Dataset rows processed: **${result.datasetRows}**\n` +
                        `- Examples learned: **${result.trainedExamples}**\n` +
                        `- Built-in examples: **${result.builtIn}**\n` +
                        `- Source: \`${result.dataset}\`\n\n` +
                        `Training data is stored locally in IndexedDB.`
                    )

                    : (
                        `# Training Complete\n\n` +
                        `CrazeMind processed **${result.datasetRows}** dataset rows.\n\n` +
                        `- Examples learned: **${result.trainedExamples}**\n` +
                        `- Built-in examples: **${result.builtIn}**\n` +
                        `- Source: \`${result.dataset}\`\n\n` +
                        `Training data is stored locally in IndexedDB.`
                    ),

            sources: []
        };

    } catch (error) {

        console.error(
            "CrazeMind training:",
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
   EXPORT
============================================================ */

async function exportCommand() {

    try {

        downloadWeights();


        return {

            answer:
                "# Export Started\n\n" +
                "CrazeMind's learned training data is being " +
                "downloaded as **crazemind-training.json**.",

            sources: []
        };

    } catch (error) {

        return {

            answer:
                `## Export Error\n\n` +
                `\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   STATS
============================================================ */

async function statsCommand() {

    try {

        const stats =
            await getTrainingStats();


        return {

            answer:
                `# CrazeMind Training\n\n` +

                `**Learned examples:** ` +
                `${stats.examples}\n\n` +

                `**Dataset:** ` +
                `\`${stats.dataset}\`\n\n` +

                `**Mode:** ` +
                `\`${stats.mode}\``,

            sources: []
        };

    } catch (error) {

        return {

            answer:
                `## Stats Error\n\n` +
                `\`${error.message}\``,

            sources: []
        };
    }
}


/* ============================================================
   COMMAND HANDLER
============================================================ */

async function handleCommand(
    question
) {

    const command =
        getCommand(
            question
        );


    if (!command) {

        return null;
    }


    const argument =
        getCommandArguments(
            question
        );


    switch (
        command
    ) {

        case "help":

            return {

                answer:
                    helpAnswer(),

                sources: []
            };


        case "about":

            return {

                answer:
                    aboutAnswer(),

                sources: []
            };


        case "train":

            return await trainCommand(
                argument
            );


        case "export":

            return await exportCommand();


        case "stats":

            return await statsCommand();


        case "math":

            return calculateMath(
                argument
            );


        case "search":

            return await performSearch(
                argument
            );


        case "wiki":

        case "wikipedia":

            return await performWikipedia(
                argument
            );


        default:

            return {

                answer:
                    `Unknown command: \`/${command}\`\n\n` +
                    `Use \`/help\` to see available commands.`,

                sources: []
            };
    }
}


/* ============================================================
   MAIN ANSWER FUNCTION
============================================================ */

export async function answerQuestion(
    question
) {

    const input =
        cleanCommand(
            question
        );


    if (!input) {

        return {

            answer:
                "Please enter a question.",

            sources: []
        };
    }


    /*
        --------------------------------------------------------
        1. COMMANDS
        --------------------------------------------------------
    */

    if (
        input.startsWith("/")
    ) {

        const commandResult =
            await handleCommand(
                input
            );


        if (
            commandResult
        ) {

            return commandResult;
        }
    }


    /*
        --------------------------------------------------------
        2. TRAINED KNOWLEDGE
        --------------------------------------------------------

        Exact trained examples are checked
        before model generation.
    */

    try {

        const learned =
            await recall(
                input
            );


        if (
            learned
        ) {

            return {

                answer:
                    learned,

                sources:
                    [
                        "CrazeMind Training"
                    ]
            };
        }

    } catch (error) {

        console.warn(
            "Training recall failed:",
            error
        );
    }


    /*
        --------------------------------------------------------
        3. MODEL
        --------------------------------------------------------
    */

    try {

        const generated =
            await modelAnswer(
                input
            );


        if (
            generated
        ) {

            return {

                answer:
                    generated,

                sources: []
            };
        }

    } catch (error) {

        console.warn(
            "Model answer failed:",
            error
        );
    }


    /*
        --------------------------------------------------------
        4. BASIC ENGINE
        --------------------------------------------------------
    */

    try {

        const basic =
            await basicAnswer(
                input
            );


        if (
            basic
        ) {

            return {

                answer:
                    basic,

                sources: []
            };
        }

    } catch (error) {

        console.warn(
            "Basic answer failed:",
            error
        );
    }


    /*
        --------------------------------------------------------
        5. FINAL FALLBACK
        --------------------------------------------------------
    */

    return {

        answer:
            `I don't have a direct answer for that yet.\n\n` +
            `Try **/search ${input}** to search the web, ` +
            `or train CrazeMind with **/train 100**.`,

        sources: []
    };
}


/* ============================================================
   OPTIONAL ALIASES
============================================================ */

export const brain =
    answerQuestion;


export const ask =
    answerQuestion;


export default answerQuestion;