/*
============================================================
CrazeMind Search Engine
CrazeStudio
============================================================

Features:
- DuckDuckGo Instant Answer
- Wikipedia fallback
- Translation/meaning detection
- Bengali meaning support
- Multiple results
============================================================
*/


const DDG_API =
    "https://api.duckduckgo.com/";

const WIKI_API =
    "https://en.wikipedia.org/api/rest_v1/page/summary/";


/* ============================================================
   NORMALIZE
============================================================ */

function normalize(text) {

    return String(text || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


/* ============================================================
   DETECT MEANING QUERY
============================================================ */

function isMeaningQuery(
    query
) {

    const q =
        normalize(query);


    return (
        q.includes("meaning of") ||
        q.includes("meaning in bengali") ||
        q.includes("meaning in bangla") ||
        q.includes("translate") ||
        q.includes("translation") ||
        q.includes("bengali meaning") ||
        q.includes("bangla meaning")
    );
}


/* ============================================================
   EXTRACT WORD
============================================================ */

function extractMeaningWord(
    query
) {

    let q =
        String(query || "")
            .trim();


    q =
        q.replace(
            /^what('?s| is)\s+(the\s+)?meaning\s+of\s+/i,
            ""
        );


    q =
        q.replace(
            /^meaning\s+of\s+/i,
            ""
        );


    q =
        q.replace(
            /^translate\s+/i,
            ""
        );


    q =
        q.replace(
            /\s+(in|to)\s+(bengali|bangla)\s*$/i,
            ""
        );


    q =
        q.replace(
            /\s+(bengali|bangla)\s+meaning\s*$/i,
            ""
        );


    return q.trim();
}


/* ============================================================
   BENGALI MEANINGS
============================================================ */

const bengaliMeanings = {

    sakura: {
        bengali:
            "সাকুরা / চেরি ফুল",

        explanation:
            "সাকুরা (Sakura) জাপানি ভাষায় চেরি গাছের ফুলকে বোঝায়। " +
            "এটি জাপানের একটি বিখ্যাত প্রতীক এবং বসন্তকালের সঙ্গে যুক্ত।"
    },

    hello: {
        bengali:
            "হ্যালো / নমস্কার",

        explanation:
            "Hello-এর বাংলা অর্থ হ্যালো বা নমস্কার।"
    },

    computer: {
        bengali:
            "কম্পিউটার",

        explanation:
            "Computer-এর বাংলা প্রচলিত রূপ হলো কম্পিউটার।"
    },

    water: {
        bengali:
            "জল / পানি",

        explanation:
            "Water-এর বাংলা অর্থ জল বা পানি।"
    },

    book: {
        bengali:
            "বই",

        explanation:
            "Book-এর বাংলা অর্থ বই।"
    },

    love: {
        bengali:
            "ভালোবাসা / প্রেম",

        explanation:
            "Love-এর বাংলা অর্থ ভালোবাসা বা প্রেম।"
    }

};


/* ============================================================
   MEANING SEARCH
============================================================ */

function getMeaning(
    query
) {

    const word =
        extractMeaningWord(
            query
        );


    const key =
        normalize(
            word
        );


    if (
        bengaliMeanings[key]
    ) {

        return {

            found:
                true,

            word:
                word,

            bengali:
                bengaliMeanings[key]
                    .bengali,

            explanation:
                bengaliMeanings[key]
                    .explanation
        };
    }


    return {

        found:
            false,

        word:
            word
    };
}


/* ============================================================
   DUCKDUCKGO
============================================================ */

async function searchDuckDuckGo(
    query
) {

    const url =
        new URL(
            DDG_API
        );


    url.searchParams.set(
        "q",
        query
    );


    url.searchParams.set(
        "format",
        "json"
    );


    url.searchParams.set(
        "no_html",
        "1"
    );


    url.searchParams.set(
        "skip_disambig",
        "1"
    );


    const response =
        await fetch(
            url.toString()
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `DuckDuckGo HTTP ${response.status}`
        );
    }


    return await response.json();
}


/* ============================================================
   WIKIPEDIA
============================================================ */

async function searchWikipedia(
    query
) {

    const word =
        extractMeaningWord(
            query
        );


    if (!word) {
        return null;
    }


    const encoded =
        encodeURIComponent(
            word
        );


    const response =
        await fetch(
            WIKI_API +
            encoded
        );


    if (
        !response.ok
    ) {

        return null;
    }


    const data =
        await response.json();


    if (
        !data ||
        !data.extract
    ) {

        return null;
    }


    return {

        title:
            data.title ||
            word,

        description:
            data.extract,

        url:
            data.content_urls
                ?.desktop
                ?.page ||
            null,

        source:
            "Wikipedia"
    };
}


/* ============================================================
   MAIN SEARCH
============================================================ */

export async function search(
    query,
    options = {}
) {

    const text =
        String(
            query || ""
        ).trim();


    if (!text) {

        return {

            query:
                "",

            results:
                []
        };
    }


    const limit =
        Math.min(
            Math.max(
                Number(
                    options.limit
                ) || 5,
                1
            ),
            10
        );


    const results =
        [];


    /*
    ------------------------------------------------------------
    1. Meaning query
    ------------------------------------------------------------
    */

    if (
        isMeaningQuery(
            text
        )
    ) {

        const meaning =
            getMeaning(
                text
            );


        if (
            meaning.found
        ) {

            results.push({

                title:
                    `${meaning.word} — Bengali meaning`,

                description:
                    `**${meaning.bengali}**\n\n` +
                    meaning.explanation,

                url:
                    null,

                source:
                    "CrazeMind Dictionary"
            });
        }
    }


    /*
    ------------------------------------------------------------
    2. DuckDuckGo
    ------------------------------------------------------------
    */

    try {

        const data =
            await searchDuckDuckGo(
                text
            );


        if (
            data.AbstractText
        ) {

            results.push({

                title:
                    data.Heading ||
                    "Answer",

                description:
                    data.AbstractText,

                url:
                    data.AbstractURL ||
                    null,

                source:
                    "DuckDuckGo"
            });
        }


        function collect(
            topics
        ) {

            if (
                !Array.isArray(
                    topics
                )
            ) {

                return;
            }


            for (
                const topic
                of topics
            ) {

                if (
                    results.length >=
                    limit
                ) {

                    return;
                }


                if (
                    topic.Text
                ) {

                    results.push({

                        title:
                            topic.Text,

                        description:
                            topic.Text,

                        url:
                            topic.FirstURL ||
                            null,

                        source:
                            "DuckDuckGo"
                    });
                }


                if (
                    topic.Topics
                ) {

                    collect(
                        topic.Topics
                    );
                }
            }
        }


        collect(
            data.RelatedTopics
        );

    } catch (error) {

        console.warn(
            "[CrazeMind] DuckDuckGo failed:",
            error
        );
    }


    /*
    ------------------------------------------------------------
    3. Wikipedia fallback
    ------------------------------------------------------------
    */

    if (
        results.length <
        limit
    ) {

        try {

            const wiki =
                await searchWikipedia(
                    text
                );


            if (
                wiki
            ) {

                results.push(
                    wiki
                );
            }

        } catch (error) {

            console.warn(
                "[CrazeMind] Wikipedia failed:",
                error
            );
        }
    }


    return {

        query:
            text,

        results:
            results.slice(
                0,
                limit
            ),

        found:
            results.length > 0
    };
}


/* ============================================================
   MARKDOWN RESPONSE
============================================================ */

export async function searchText(
    query,
    options = {}
) {

    const result =
        await search(
            query,
            options
        );


    if (
        !result.results.length
    ) {

        return (
            `## Search\n\n` +
            `No results found for **${query}**.`
        );
    }


    let output =
        `## Search results\n\n`;


    for (
        const item
        of result.results
    ) {

        output +=
            `### ${item.title}\n\n`;


        if (
            item.description
        ) {

            output +=
                `${item.description}\n\n`;
        }


        if (
            item.url
        ) {

            output +=
                `[Open result](${item.url})\n\n`;
        }


        output +=
            `*Source: ${item.source}*\n\n`;
    }


    return output.trim();
}


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default search;