/*
    CrazeMind Basic + Math Engine
    Brand: CrazeStudio

    JavaScript only.
    Uses Math.js from CDN.
*/

import {
    evaluate,
    simplify,
    derivative,
    fraction,
    format
} from "https://cdn.jsdelivr.net/npm/mathjs@14.0.1/+esm";


/* =========================================================
   Identity
========================================================= */

const IDENTITY = {
    name: "CrazeMind",
    brand: "CrazeStudio",
    creator: "CrazeStudio"
};


/* =========================================================
   Helpers
========================================================= */

function clean(text) {
    return String(text)
        .replace(/\s+/g, " ")
        .trim();
}


function isMathQuestion(text) {

    const q =
        text.toLowerCase();

    return (
        /[\d+\-*/^=]/.test(q) ||
        q.includes("calculate") ||
        q.includes("solve") ||
        q.includes("simplify") ||
        q.includes("derivative") ||
        q.includes("differentiate") ||
        q.includes("integral") ||
        q.includes("factor") ||
        q.includes("equation") ||
        q.includes("probability") ||
        q.includes("log") ||
        q.includes("sin") ||
        q.includes("cos") ||
        q.includes("tan") ||
        q.includes("sqrt")
    );
}


function cleanMathExpression(text) {

    let expression =
        text.trim();

    expression =
        expression
            .replace(/^calculate\s+/i, "")
            .replace(/^what\s+is\s+/i, "")
            .replace(/^evaluate\s+/i, "")
            .replace(/^find\s+/i, "")
            .replace(/\?+$/, "")
            .trim();


    /*
        Common notation conversions.
    */

    expression =
        expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/π/g, "pi")
            .replace(/√/g, "sqrt")
            .replace(/²/g, "^2")
            .replace(/³/g, "^3");


    return expression;
}


/* =========================================================
   Advanced math
========================================================= */

function solveMath(question) {

    const original =
        question.trim();


    const lower =
        original.toLowerCase();


    try {

        /* -------------------------------------------------
           Derivative
        ------------------------------------------------- */

        if (
            lower.includes("derivative") ||
            lower.includes("differentiate")
        ) {

            let expression =
                original
                    .replace(
                        /.*?(derivative|differentiate)\s*(of|for)?\s*/i,
                        ""
                    )
                    .trim();


            expression =
                expression
                    .replace(
                        /\s+with\s+respect\s+to\s+x.*$/i,
                        ""
                    )
                    .trim();


            if (!expression) {
                return null;
            }


            const result =
                derivative(
                    expression,
                    "x"
                );


            return (
                "The derivative of " +
                expression +
                " with respect to x is:\n\n" +
                format(
                    result,
                    {
                        fraction: "ratio"
                    }
                )
            );
        }


        /* -------------------------------------------------
           Simplification
        ------------------------------------------------- */

        if (
            lower.includes("simplify")
        ) {

            let expression =
                original
                    .replace(
                        /.*?simplify\s*/i,
                        ""
                    )
                    .replace(/\?+$/, "")
                    .trim();


            const result =
                simplify(
                    expression
                );


            return (
                "Simplified result:\n\n" +
                result.toString()
            );
        }


        /* -------------------------------------------------
           Factorization
        ------------------------------------------------- */

        if (
            lower.includes("factor")
        ) {

            let expression =
                original
                    .replace(
                        /.*?factor\s*/i,
                        ""
                    )
                    .replace(/\?+$/, "")
                    .trim();


            const result =
                simplify(
                    expression
                );


            return (
                "Factored/simplified form:\n\n" +
                result.toString()
            );
        }


        /* -------------------------------------------------
           Direct equation/expression
        ------------------------------------------------- */

        let expression =
            cleanMathExpression(
                original
            );


        /*
            Convert "2x" → "2*x"
            for common simple algebra.
        */

        expression =
            expression.replace(
                /(\d)([a-zA-Z])/g,
                "$1*$2"
            );


        expression =
            expression.replace(
                /([a-zA-Z])(\d)/g,
                "$1*$2"
            );


        /*
            Remove natural-language prefixes.
        */

        expression =
            expression
                .replace(
                    /^solve\s+/i,
                    ""
                )
                .replace(
                    /^equation\s+/i,
                    ""
                );


        /*
            Don't send ordinary sentences
            to the math parser.
        */

        if (
            /[a-zA-Z]{3,}/.test(
                expression
            ) &&
            !/\b(pi|sin|cos|tan|sqrt|log|ln)\b/i.test(
                expression
            )
        ) {

            return null;
        }


        const result =
            evaluate(
                expression
            );


        if (
            result === undefined ||
            result === null
        ) {

            return null;
        }


        let answer;


        if (
            typeof result === "object"
        ) {

            answer =
                format(
                    result,
                    {
                        fraction: "ratio"
                    }
                );

        } else {

            answer =
                String(result);
        }


        return (
            "Result:\n\n" +
            answer
        );

    } catch {

        return null;
    }
}


/* =========================================================
   Basic responses
========================================================= */

export function basicAnswer(question) {

    const q =
        clean(question);


    const lower =
        q.toLowerCase();


    if (!q) {
        return null;
    }


    /* -----------------------------------------------------
       Identity
    ----------------------------------------------------- */

    if (
        lower === "what is your name" ||
        lower === "what's your name" ||
        lower === "who are you"
    ) {

        return (
            "I am " +
            IDENTITY.name +
            ", an experimental AI created by " +
            IDENTITY.creator +
            "."
        );
    }


    if (
        lower.includes("who created you") ||
        lower.includes("who made you") ||
        lower.includes("who built you")
    ) {

        return (
            IDENTITY.name +
            " was created by " +
            IDENTITY.creator +
            "."
        );
    }


    if (
        lower.includes("what is your brand")
    ) {

        return (
            "My brand is " +
            IDENTITY.brand +
            "."
        );
    }


    /* -----------------------------------------------------
       Greetings
    ----------------------------------------------------- */

    if (
        /^(hi|hello|hey|yo)\b/i.test(q)
    ) {

        return (
            "Hello! I'm " +
            IDENTITY.name +
            ". How can I help?"
        );
    }


    /* -----------------------------------------------------
       Math
    ----------------------------------------------------- */

    if (
        isMathQuestion(q)
    ) {

        const math =
            solveMath(q);


        if (math) {
            return math;
        }
    }


    return null;
}


/* =========================================================
   Exports
========================================================= */

export {
    solveMath
};