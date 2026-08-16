/*
============================================================
CrazeMind Gemini API
CrazeStudio
============================================================

Netlify Function

Expected environment variable:

GEMINI_API_KEY

Frontend endpoint:

/.netlify/functions/gemini

Request:

POST
{
    "question": "Hello"
}

Response:

{
    "answer": "...",
    "model": "gemini-3.6-flash",
    "source": "Gemini"
}
============================================================
*/


/* ============================================================
   CONFIGURATION
============================================================ */

const MODEL =
    "gemini-3.6-flash";


/* ============================================================
   MAIN NETLIFY FUNCTION
============================================================ */

export default async function handler(
    request
) {

    /* ========================================================
       CORS
    ======================================================== */

    const headers = {

        "Access-Control-Allow-Origin":
            "*",

        "Access-Control-Allow-Methods":
            "POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Content-Type":
            "application/json"

    };


    /* ========================================================
       OPTIONS / PREFLIGHT
    ======================================================== */

    if (
        request.method ===
        "OPTIONS"
    ) {

        return new Response(
            null,
            {
                status: 204,
                headers
            }
        );
    }


    /* ========================================================
       ONLY POST
    ======================================================== */

    if (
        request.method !==
        "POST"
    ) {

        return new Response(

            JSON.stringify({

                error:
                    "Method not allowed."

            }),

            {
                status: 405,
                headers
            }
        );
    }


    /* ========================================================
       GET GEMINI API KEY
    ======================================================== */

    const apiKey =
        String(

            Netlify
                .env
                .get(
                    "GEMINI_API_KEY"
                ) || ""

        ).trim();


    if (
        !apiKey
    ) {

        console.error(
            "[CrazeMind] GEMINI_API_KEY is missing."
        );


        return new Response(

            JSON.stringify({

                error:
                    "GEMINI_API_KEY is not configured on Netlify."

            }),

            {
                status: 500,
                headers
            }
        );
    }


    /* ========================================================
       READ REQUEST BODY
    ======================================================== */

    let body;


    try {

        body =
            await request.json();

    } catch (
        error
    ) {

        console.error(
            "[CrazeMind] Invalid request JSON:",
            error
        );


        return new Response(

            JSON.stringify({

                error:
                    "Invalid JSON request."

            }),

            {
                status: 400,
                headers
            }
        );
    }


    /* ========================================================
       GET QUESTION
    ======================================================== */

    const question =
        String(

            body?.question ||
            body?.prompt ||
            ""

        ).trim();


    if (
        !question
    ) {

        return new Response(

            JSON.stringify({

                error:
                    "No question provided."

            }),

            {
                status: 400,
                headers
            }
        );
    }


    /* ========================================================
       GEMINI API URL
    ======================================================== */

    const url =
        "https://generativelanguage.googleapis.com/" +
        "v1beta/models/" +
        MODEL +
        ":generateContent";


    /* ========================================================
       CALL GEMINI
    ======================================================== */

    try {

        const response =
            await fetch(

                url,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey

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


        /* ====================================================
           READ GEMINI RESPONSE
        ==================================================== */

        const raw =
            await response.text();


        /* ====================================================
           GEMINI HTTP ERROR
        ==================================================== */

        if (
            !response.ok
        ) {

            let details =
                raw;


            try {

                const errorData =
                    JSON.parse(
                        raw
                    );


                details =
                    errorData
                        ?.error
                        ?.message ||
                    errorData
                        ?.error ||
                    raw;

            } catch {

                // Keep raw response.

            }


            console.error(

                "[CrazeMind] Gemini API error:",
                response.status,
                details

            );


            return new Response(

                JSON.stringify({

                    error:
                        "Gemini request failed.",

                    details:
                        details,

                    status:
                        response.status,

                    model:
                        MODEL

                }),

                {

                    status:
                        response.status,

                    headers

                }
            );
        }


        /* ====================================================
           PARSE GEMINI JSON
        ==================================================== */

        let data;


        try {

            data =
                JSON.parse(
                    raw
                );

        } catch (
            error
        ) {

            console.error(

                "[CrazeMind] Invalid Gemini JSON:",
                error

            );


            return new Response(

                JSON.stringify({

                    error:
                        "Gemini returned invalid JSON."

                }),

                {

                    status:
                        502,

                    headers

                }
            );
        }


        /* ====================================================
           EXTRACT ANSWER
        ==================================================== */

        const answer =
            data
                ?.candidates?.[0]
                ?.content
                ?.parts
                ?.map(
                    part =>
                        String(
                            part?.text ||
                            ""
                        )
                )
                .join("")
                .trim();


        /* ====================================================
           CHECK EMPTY ANSWER
        ==================================================== */

        if (
            !answer
        ) {

            const reason =
                data
                    ?.promptFeedback
                    ?.blockReason ||
                data
                    ?.candidates?.[0]
                    ?.finishReason ||
                "Gemini returned no text.";


            console.error(

                "[CrazeMind] Gemini returned no answer:",
                reason

            );


            return new Response(

                JSON.stringify({

                    error:
                        "Gemini did not return any text.",

                    details:
                        reason,

                    model:
                        MODEL

                }),

                {

                    status:
                        502,

                    headers

                }
            );
        }


        /* ====================================================
           SUCCESS
        ==================================================== */

        return new Response(

            JSON.stringify({

                answer:
                    answer,

                model:
                    MODEL,

                source:
                    "Gemini"

            }),

            {

                status:
                    200,

                headers

            }
        );

    } catch (
        error
    ) {

        /* ====================================================
           NETWORK / FUNCTION ERROR
        ==================================================== */

        console.error(

            "[CrazeMind] Gemini request error:",
            error

        );


        return new Response(

            JSON.stringify({

                error:
                    "Could not contact Gemini.",

                details:
                    error?.message ||
                    String(error)

            }),

            {

                status:
                    502,

                headers

            }
        );
    }
}
