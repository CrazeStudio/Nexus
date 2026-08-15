/*
============================================================
CrazeMind Hugging Face Proxy
CrazeStudio
============================================================
*/

export default async function handler(req, res) {

    /* CORS */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    if (req.method === "OPTIONS") {

        return res.status(200).end();
    }


    if (req.method !== "GET") {

        return res.status(405).json({
            error: "Method not allowed"
        });
    }


    /* Parameters */

    const dataset =
        String(
            req.query.dataset ||
            "togethercomputer/llama-instruct"
        );

    const config =
        String(
            req.query.config ||
            "default"
        );

    const split =
        String(
            req.query.split ||
            "train"
        );

    const offset =
        Math.max(
            0,
            Number(req.query.offset) || 0
        );

    const length =
        Math.min(
            100,
            Math.max(
                1,
                Number(req.query.length) || 100
            )
        );


    /* Hugging Face API */

    const url =
        new URL(
            "https://datasets-server.huggingface.co/rows"
        );


    url.searchParams.set(
        "dataset",
        dataset
    );

    url.searchParams.set(
        "config",
        config
    );

    url.searchParams.set(
        "split",
        split
    );

    url.searchParams.set(
        "offset",
        String(offset)
    );

    url.searchParams.set(
        "length",
        String(length)
    );


    console.log(
        "[CrazeMind] Hugging Face:",
        url.toString()
    );


    try {

        const response =
            await fetch(
                url.toString(),
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "CrazeMind-CrazeStudio"
                    }
                }
            );


        const text =
            await response.text();


        console.log(
            "[CrazeMind] HF status:",
            response.status
        );


        if (!response.ok) {

            return res.status(
                response.status
            ).json({

                error:
                    "Hugging Face request failed",

                status:
                    response.status,

                details:
                    text.slice(
                        0,
                        2000
                    )
            });
        }


        let data;


        try {

            data =
                JSON.parse(
                    text
                );

        } catch {

            return res.status(502).json({

                error:
                    "Hugging Face returned invalid JSON",

                details:
                    text.slice(
                        0,
                        1000
                    )
            });
        }


        if (
            !data ||
            !Array.isArray(data.rows)
        ) {

            return res.status(502).json({

                error:
                    "Invalid dataset response",

                details:
                    "Hugging Face did not return a rows array."
            });
        }


        return res.status(200).json({

            rows:
                data.rows,

            num_rows_total:
                data.num_rows_total ?? null,

            num_rows_per_page:
                data.num_rows_per_page ??
                data.rows.length,

            partial:
                data.partial ?? false

        });

    } catch (error) {

        console.error(
            "[CrazeMind] Proxy error:",
            error
        );


        return res.status(502).json({

            error:
                "Could not contact Hugging Face",

            details:
                error?.message ||
                String(error)
        });
    }
}