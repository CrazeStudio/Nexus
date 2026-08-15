/*
============================================================
CrazeMind Gemini API
CrazeStudio
============================================================
*/

const MODEL =
    "gemini-3.6-flash";


export default async function handler(
    req,
    res
) {

    /* --------------------------------------------------------
       CORS
    -------------------------------------------------------- */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    if (
        req.method === "OPTIONS"
    ) {

        return res
            .status(200)
            .end();
    }


    if (
        req.method !== "POST"
    ) {

        return res
            .status(405)
            .json({
                error:
                    "Method not allowed"
            });
    }


    /* --------------------------------------------------------
       API KEY
    -------------------------------------------------------- */

    const apiKey =
        process.env.GEMINI_API_KEY;


    if (!apiKey) {

        return res
            .status(500)
            .json({

                error:
                    "GEMINI_API_KEY is not configured on Vercel."
            });
    }


    /* --------------------------------------------------------
       REQUEST
    -------------------------------------------------------- */

    const question =
        String(
            req.body?.prompt ||
            req.body?.question ||
            ""
        ).trim();


    if (!question) {

        return res
            .status(400)
            .json({

                error:
                    "No question provided."
            });
    }


    /* --------------------------------------------------------
       GEMINI REQUEST
    -------------------------------------------------------- */

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;


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


        const text =
            await response.text();


        if (
            !response.ok
        ) {

            let details =
                text;


            try {

                const errorData =
                    JSON.parse(
                        text
                    );


                details =
                    errorData?.error?.message ||
                    errorData?.error ||
                    text;

            } catch {
                // Keep raw response.
            }


            return res
                .status(
                    response.status
                )
                .json({

                    error:
                        "Gemini request failed.",

                    details:
                        details
                });
        }


        let data;


        try {

            data =
                JSON.parse(
                    text
                );

        } catch {

            return res
                .status(502)
                .json({

                    error:
                        "Gemini returned invalid JSON."
                });
        }


        /* ----------------------------------------------------
           EXTRACT TEXT
        ---------------------------------------------------- */

        const answer =
            data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part.text || ""
                )
                .join("")
                .trim();


        if (!answer) {

            return res
                .status(502)
                .json({

                    error:
                        "Gemini did not return any text."
                });
        }


        return res
            .status(200)
            .json({

                answer:
                    answer,

                model:
                    MODEL,

                source:
                    "Gemini"
            });

    } catch (error) {

        console.error(
            "[CrazeMind] Gemini error:",
            error
        );


        return res
            .status(502)
            .json({

                error:
                    "Could not contact Gemini.",

                details:
                    error?.message ||
                    String(error)
            });
    }
}