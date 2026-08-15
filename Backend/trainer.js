/*
============================================================
CrazeMind Trainer
CrazeStudio
============================================================

Supported:

/train 10
/train 100
/train 500
/train 1000
/train full
/train all
/train 0

This stores dataset examples in IndexedDB.

IMPORTANT:
This is retrieval/dataset learning.
It does NOT fine-tune Llama neural weights.
============================================================
*/


/* ============================================================
   CONFIG
============================================================ */

const DATASET =
    "togethercomputer/llama-instruct";

const DATASET_CONFIG =
    "default";

const DATASET_SPLIT =
    "train";

const PAGE_SIZE =
    100;

const MAX_NORMAL_TRAIN =
    2000;

const API_PATH =
    "/api/huggingface";


/* ============================================================
   DATABASE
============================================================ */

const DB_NAME =
    "CrazeMindDB";

const DB_VERSION =
    8;

const STORE_NAME =
    "training";


/* ============================================================
   BUILT-IN KNOWLEDGE
============================================================ */

const builtInExamples = [
    {
        input: "what is ai",

        output:
            "## Artificial Intelligence\n\n" +
            "Artificial intelligence (AI) is technology " +
            "that allows computers to perform tasks " +
            "that normally require human intelligence.",

        source: "CrazeMind"
    },

    {
        input: "what is artificial intelligence",

        output:
            "## Artificial Intelligence\n\n" +
            "AI is the field of creating computer systems " +
            "that can perform tasks such as reasoning, " +
            "learning, perception, and language processing.",

        source: "CrazeMind"
    },

    {
        input: "who created you",

        output:
            "## CrazeMind\n\n" +
            "I am **CrazeMind**, an AI created by **CrazeStudio**.",

        source: "CrazeMind"
    },

    {
        input: "who made you",

        output:
            "I am **CrazeMind**, created by **CrazeStudio**.",

        source: "CrazeMind"
    },

    {
        input: "what is crazemind",

        output:
            "## CrazeMind\n\n" +
            "CrazeMind is an AI project created by **CrazeStudio**.",

        source: "CrazeMind"
    },

    {
        input: "what is javascript",

        output:
            "## JavaScript\n\n" +
            "JavaScript is a programming language commonly " +
            "used to create interactive websites and web applications.",

        source: "CrazeMind"
    },

    {
        input: "what is html",

        output:
            "## HTML\n\n" +
            "HTML stands for **HyperText Markup Language**. " +
            "It provides the structure of web pages.",

        source: "CrazeMind"
    },

    {
        input: "what is css",

        output:
            "## CSS\n\n" +
            "CSS stands for **Cascading Style Sheets**. " +
            "It controls the appearance and layout of web pages.",

        source: "CrazeMind"
    },

    {
        input: "what is python",

        output:
            "## Python\n\n" +
            "Python is a high-level programming language " +
            "known for its readable syntax.",

        source: "CrazeMind"
    },

    {
        input: "hello",

        output:
            "Hello! I'm **CrazeMind**, created by **CrazeStudio**.",

        source: "CrazeMind"
    },

    {
        input: "hi",

        output:
            "Hi! I'm **CrazeMind**. How can I help?",

        source: "CrazeMind"
    },

    {
        input: "hey",

        output:
            "Hey! I'm **CrazeMind**. What can I help you with?",

        source: "CrazeMind"
    }
];


/* ============================================================
   NORMALIZE
============================================================ */

function normalize(text) {

    return String(text || "")
        .toLowerCase()
        .replace(
            /[^\p{L}\p{N}\s]/gu,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


/* ============================================================
   OPEN DATABASE
============================================================ */

function openDatabase() {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof indexedDB === "undefined"
            ) {

                reject(
                    new Error(
                        "IndexedDB is not available."
                    )
                );

                return;
            }


            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;


                    let store;


                    if (
                        !db.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        store =
                            db.createObjectStore(
                                STORE_NAME,
                                {
                                    keyPath: "id"
                                }
                            );

                    } else {

                        store =
                            event.target.transaction
                                .objectStore(
                                    STORE_NAME
                                );
                    }


                    if (
                        !store.indexNames.contains(
                            "input"
                        )
                    ) {

                        store.createIndex(
                            "input",
                            "input",
                            {
                                unique: false
                            }
                        );
                    }


                    if (
                        !store.indexNames.contains(
                            "source"
                        )
                    ) {

                        store.createIndex(
                            "source",
                            "source",
                            {
                                unique: false
                            }
                        );
                    }
                };


            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );
                };


            request.onerror =
                () => {

                    reject(
                        new Error(
                            request.error?.message ||
                            "Could not open IndexedDB."
                        )
                    );
                };
        }
    );
}


/* ============================================================
   STORE EXAMPLES
============================================================ */

async function storeExamples(
    examples
) {

    if (
        !Array.isArray(examples) ||
        examples.length === 0
    ) {

        return 0;
    }


    const db =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            let transaction;


            try {

                transaction =
                    db.transaction(
                        STORE_NAME,
                        "readwrite"
                    );

            } catch (error) {

                db.close();

                reject(
                    new Error(
                        `Database transaction failed: ${
                            error?.message ||
                            String(error)
                        }`
                    )
                );

                return;
            }


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            let saved = 0;


            try {

                for (
                    const example of examples
                ) {

                    if (
                        !example ||
                        !example.input ||
                        !example.output
                    ) {

                        continue;
                    }


                    const input =
                        String(
                            example.input
                        ).trim();


                    const output =
                        String(
                            example.output
                        ).trim();


                    const id =
                        normalize(
                            input
                        );


                    if (
                        !id ||
                        !output
                    ) {

                        continue;
                    }


                    store.put({

                        id: id,

                        input: input,

                        output: output,

                        source:
                            example.source ||
                            DATASET,

                        trainedAt:
                            Date.now()
                    });


                    saved++;
                }

            } catch (error) {

                try {
                    db.close();
                } catch {}

                reject(
                    new Error(
                        `Failed to save training data: ${
                            error?.message ||
                            String(error)
                        }`
                    )
                );

                return;
            }


            transaction.oncomplete =
                () => {

                    try {
                        db.close();
                    } catch {}

                    resolve(
                        saved
                    );
                };


            transaction.onerror =
                () => {

                    const error =
                        transaction.error;

                    try {
                        db.close();
                    } catch {}

                    reject(
                        new Error(
                            `IndexedDB error: ${
                                error?.message ||
                                String(error) ||
                                "Unknown error"
                            }`
                        )
                    );
                };


            transaction.onabort =
                () => {

                    const error =
                        transaction.error;

                    try {
                        db.close();
                    } catch {}

                    reject(
                        new Error(
                            `IndexedDB transaction aborted: ${
                                error?.message ||
                                String(error) ||
                                "Unknown error"
                            }`
                        )
                    );
                };
        }
    );
}


/* ============================================================
   API URL
============================================================ */

function getApiURL() {

    if (
        typeof window === "undefined"
    ) {

        throw new Error(
            "Training requires a browser."
        );
    }


    /*
       A simple localhost HTML preview cannot
       run a Vercel serverless function.
    */

    const hostname =
        window.location.hostname;


    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1"
    ) {

        throw new Error(
            "CrazeMind is running on a normal local preview server. " +
            "The /api/huggingface Vercel function is unavailable there. " +
            "Use the deployed Vercel URL or run the project with `vercel dev`."
        );
    }


    return new URL(
        API_PATH,
        window.location.origin
    );
}


/* ============================================================
   FETCH DATA
============================================================ */

async function fetchRows(
    offset,
    length
) {

    const url =
        getApiURL();


    url.searchParams.set(
        "dataset",
        DATASET
    );


    url.searchParams.set(
        "config",
        DATASET_CONFIG
    );


    url.searchParams.set(
        "split",
        DATASET_SPLIT
    );


    url.searchParams.set(
        "offset",
        String(
            Math.max(
                0,
                Number(offset) || 0
            )
        )
    );


    url.searchParams.set(
        "length",
        String(
            Math.min(
                PAGE_SIZE,
                Math.max(
                    1,
                    Number(length) || 1
                )
            )
        )
    );


    console.log(
        "[CrazeMind] API request:",
        url.href
    );


    let response;


    try {

        response =
            await fetch(
                url.href,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json"
                    },

                    cache:
                        "no-store"
                }
            );

    } catch (error) {

        console.error(
            "[CrazeMind] Network error:",
            error
        );


        throw new Error(
            `Could not connect to CrazeMind API: ${
                error?.message ||
                String(error)
            }`
        );
    }


    const text =
        await response.text();


    console.log(
        "[CrazeMind] API status:",
        response.status
    );


    if (
        !response.ok
    ) {

        let message =
            text ||
            "No response body";


        try {

            const json =
                JSON.parse(
                    text
                );


            message =
                json.details ||
                json.error ||
                message;

        } catch {}


        throw new Error(
            `Training API returned HTTP ${
                response.status
            }: ${
                message
            }`
        );
    }


    if (
        !text.trim()
    ) {

        throw new Error(
            "Training API returned an empty response."
        );
    }


    let data;


    try {

        data =
            JSON.parse(
                text
            );

    } catch {

        throw new Error(
            "Training API returned invalid JSON."
        );
    }


    if (
        !data ||
        !Array.isArray(
            data.rows
        )
    ) {

        throw new Error(
            "Training API did not return a rows array."
        );
    }


    return data;
}


/* ============================================================
   PARSE LLAMA TEXT
============================================================ */

function parseLlamaText(
    text
) {

    if (!text) {
        return [];
    }


    const clean =
        String(
            text
        ).trim();


    const results =
        [];


    const regex =
        /\[INST\]\s*([\s\S]*?)\s*\[\/INST\]\s*([\s\S]*?)(?=\s*\[INST\]|$)/gi;


    let match;


    while (
        (
            match =
                regex.exec(
                    clean
                )
        ) !== null
    ) {

        const input =
            String(
                match[1] || ""
            ).trim();


        const output =
            String(
                match[2] || ""
            ).trim();


        if (
            input &&
            output
        ) {

            results.push({

                input: input,

                output: output,

                source:
                    DATASET
            });
        }
    }


    return results;
}


/* ============================================================
   PARSE ROW
============================================================ */

function parseRow(
    item
) {

    if (!item) {
        return [];
    }


    const row =
        item.row ||
        item;


    if (
        typeof row.text === "string"
    ) {

        return parseLlamaText(
            row.text
        );
    }


    const input =
        row.prompt ||
        row.instruction ||
        row.question ||
        row.input;


    const output =
        row.response ||
        row.output ||
        row.answer;


    if (
        input &&
        output
    ) {

        return [{

            input:
                String(input),

            output:
                String(output),

            source:
                DATASET
        }];
    }


    return [];
}


/* ============================================================
   DOWNLOAD LLAMA DATA
============================================================ */

export async function downloadLlamaData(
    amount = 20,
    options = {}
) {

    let requested =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            requested
        )
    ) {

        requested = 20;
    }


    requested =
        Math.floor(
            requested
        );


    const full =
        requested === 0;


    if (
        requested < 0
    ) {

        throw new Error(
            "Training amount cannot be negative."
        );
    }


    if (
        !full
    ) {

        requested =
            Math.min(
                Math.max(
                    requested,
                    1
                ),
                MAX_NORMAL_TRAIN
            );
    }


    const onProgress =
        typeof options.onProgress ===
        "function"
            ? options.onProgress
            : null;


    let offset =
        Math.max(
            0,
            Number(
                options.offset || 0
            )
        );


    let rowsProcessed = 0;

    let examplesSaved = 0;


    while (
        full ||
        rowsProcessed < requested
    ) {

        const remaining =
            full
                ? PAGE_SIZE
                : requested -
                  rowsProcessed;


        const pageLength =
            Math.min(
                PAGE_SIZE,
                remaining
            );


        if (onProgress) {

            onProgress({

                phase:
                    "downloading",

                current:
                    rowsProcessed,

                total:
                    full
                        ? null
                        : requested,

                percent:
                    full
                        ? null
                        : Math.round(
                            (
                                rowsProcessed /
                                requested
                            ) * 100
                        ),

                examples:
                    examplesSaved,

                message:
                    full
                        ? `Downloading rows ${offset}-${offset + pageLength - 1}...`
                        : `Downloading ${rowsProcessed}/${requested}...`
            });
        }


        const data =
            await fetchRows(
                offset,
                pageLength
            );


        const rows =
            data.rows;


        if (
            rows.length === 0
        ) {

            break;
        }


        const examples =
            [];


        for (
            const item of rows
        ) {

            try {

                const parsed =
                    parseRow(
                        item
                    );


                if (
                    parsed.length > 0
                ) {

                    examples.push(
                        ...parsed
                    );
                }

            } catch (error) {

                console.warn(
                    "[CrazeMind] Parse error:",
                    error
                );
            }
        }


        if (
            examples.length > 0
        ) {

            const saved =
                await storeExamples(
                    examples
                );


            examplesSaved +=
                saved;
        }


        rowsProcessed +=
            rows.length;


        offset +=
            rows.length;


        if (onProgress) {

            onProgress({

                phase:
                    "training",

                current:
                    rowsProcessed,

                total:
                    full
                        ? null
                        : requested,

                percent:
                    full
                        ? null
                        : Math.round(
                            (
                                rowsProcessed /
                                requested
                            ) * 100
                        ),

                examples:
                    examplesSaved,

                message:
                    full
                        ? `Learned ${examplesSaved} examples — ${rowsProcessed} rows processed`
                        : `Learned ${examplesSaved} examples`
            });
        }


        if (
            !full &&
            rowsProcessed >= requested
        ) {

            break;
        }


        if (
            rows.length < pageLength
        ) {

            break;
        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    10
                )
        );
    }


    if (
        examplesSaved === 0
    ) {

        throw new Error(
            "No usable training examples were found."
        );
    }


    if (onProgress) {

        onProgress({

            phase:
                "complete",

            current:
                rowsProcessed,

            total:
                full
                    ? rowsProcessed
                    : requested,

            percent:
                100,

            examples:
                examplesSaved,

            message:
                full
                    ? `Full training complete — ${examplesSaved} examples`
                    : `Training complete — ${examplesSaved} examples`
        });
    }


    return {

        rows:
            rowsProcessed,

        examples:
            examplesSaved,

        dataset:
            DATASET,

        config:
            DATASET_CONFIG,

        split:
            DATASET_SPLIT,

        wholeDataset:
            full
    };
}


/* ============================================================
   MAIN TRAIN FUNCTION
============================================================ */

export async function trainCrazeMind(
    amount = 20,
    options = {}
) {

    const onProgress =
        typeof options.onProgress ===
        "function"
            ? options.onProgress
            : null;


    if (onProgress) {

        onProgress({

            phase:
                "initializing",

            current:
                0,

            total:
                amount,

            percent:
                0,

            examples:
                0,

            message:
                "Initializing CrazeMind..."
        });
    }


    const builtIn =
        await storeExamples(
            builtInExamples
        );


    const result =
        await downloadLlamaData(
            amount,
            {
                ...options,
                onProgress
            }
        );


    return {

        requested:
            amount,

        wholeDataset:
            result.wholeDataset,

        datasetRows:
            result.rows,

        trainedExamples:
            result.examples,

        builtIn:
            builtIn,

        dataset:
            result.dataset,

        config:
            result.config,

        split:
            result.split,

        mode:
            "llama-instruct-retrieval"
    };
}


/* ============================================================
   LEARN
============================================================ */

export async function learn(
    input,
    output
) {

    if (
        !input ||
        !output
    ) {

        return false;
    }


    const saved =
        await storeExamples([

            {
                input:
                    String(input),

                output:
                    String(output),

                source:
                    "user"
            }

        ]);


    return saved > 0;
}


/* ============================================================
   RECALL
============================================================ */

export async function recall(
    input
) {

    const key =
        normalize(
            input
        );


    if (!key) {
        return null;
    }


    const db =
        await openDatabase();


    return new Promise(
        resolve => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.get(
                    key
                );


            request.onsuccess =
                () => {

                    const result =
                        request.result;


                    db.close();


                    resolve(
                        result
                            ? result.output
                            : null
                    );
                };


            request.onerror =
                () => {

                    db.close();

                    resolve(
                        null
                    );
                };
        }
    );
}


/* ============================================================
   STATS
============================================================ */

export async function getTrainingStats() {

    const db =
        await openDatabase();


    return new Promise(
        resolve => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.count();


            request.onsuccess =
                () => {

                    const count =
                        request.result;


                    db.close();


                    resolve({

                        examples:
                            count,

                        dataset:
                            DATASET,

                        mode:
                            "llama-instruct-retrieval"
                    });
                };


            request.onerror =
                () => {

                    db.close();


                    resolve({

                        examples:
                            0,

                        dataset:
                            DATASET,

                        mode:
                            "llama-instruct-retrieval"
                    });
                };
        }
    );
}


/* ============================================================
   EXPORT DATASET
============================================================ */

export async function exportDataset() {

    const db =
        await openDatabase();


    const result =
        await new Promise(
            (resolve, reject) => {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        STORE_NAME
                    );


                const request =
                    store.getAll();


                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            new Error(
                                "Export failed."
                            )
                        );
                    };
            }
        );


    db.close();


    return result;
}


/* ============================================================
   DOWNLOAD TRAINING DATA
============================================================ */

export async function downloadWeights() {

    const examples =
        await exportDataset();


    const data = {

        format:
            "CrazeMind-Training",

        brand:
            "CrazeStudio",

        model:
            "CrazeMind",

        dataset:
            DATASET,

        createdAt:
            new Date().toISOString(),

        examples:
            examples
    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "crazemind-training.json";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );


    return true;
}


/* ============================================================
   IMPORT
============================================================ */

export async function importWeights(
    file
) {

    if (!file) {

        throw new Error(
            "No training file selected."
        );
    }


    const text =
        await file.text();


    let data;


    try {

        data =
            JSON.parse(
                text
            );

    } catch {

        throw new Error(
            "Training file is not valid JSON."
        );
    }


    if (
        !Array.isArray(
            data?.examples
        )
    ) {

        throw new Error(
            "Invalid CrazeMind training file."
        );
    }


    return trainDataset(
        data.examples
    );
}


/* ============================================================
   CUSTOM DATASET
============================================================ */

export async function trainDataset(
    dataset,
    options = {}
) {

    if (
        !Array.isArray(dataset)
    ) {

        throw new TypeError(
            "Dataset must be an array."
        );
    }


    const batchSize =
        100;


    let saved =
        0;


    for (
        let i = 0;
        i < dataset.length;
        i += batchSize
    ) {

        const batch =
            dataset.slice(
                i,
                i + batchSize
            );


        const cleaned =
            batch
                .filter(
                    item =>
                        item &&
                        item.input &&
                        item.output
                )
                .map(
                    item => ({

                        input:
                            String(
                                item.input
                            ),

                        output:
                            String(
                                item.output
                            ),

                        source:
                            item.source ||
                            "custom"
                    })
                );


        if (
            cleaned.length > 0
        ) {

            saved +=
                await storeExamples(
                    cleaned
                );
        }


        if (
            typeof options.onProgress ===
            "function"
        ) {

            options.onProgress({

                phase:
                    "training",

                current:
                    Math.min(
                        i + batchSize,
                        dataset.length
                    ),

                total:
                    dataset.length,

                percent:
                    dataset.length === 0
                        ? 100
                        : Math.round(
                            (
                                Math.min(
                                    i + batchSize,
                                    dataset.length
                                ) /
                                dataset.length
                            ) * 100
                        ),

                examples:
                    saved,

                message:
                    `Imported ${saved} examples`
            });
        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    0
                )
        );
    }


    return {

        trained:
            saved,

        total:
            dataset.length,

        source:
            "custom"
    };
}


/* ============================================================
   CLEAR TRAINING
============================================================ */

export async function clearTraining() {

    const db =
        await openDatabase();


    return new Promise(
        resolve => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.clear();


            request.onsuccess =
                () => {

                    db.close();

                    resolve(
                        true
                    );
                };


            request.onerror =
                () => {

                    db.close();

                    resolve(
                        false
                    );
                };
        }
    );
}


/* ============================================================
   RESET TRAINING
============================================================ */

export async function resetTraining(
    amount = 20,
    options = {}
) {

    await clearTraining();


    return trainCrazeMind(
        amount,
        options
    );
}


/* ============================================================
   TRAINER OBJECT
============================================================ */

export const trainer = {

    train:
        trainCrazeMind,

    trainCrazeMind:
        trainCrazeMind,

    trainFromLlama:
        trainCrazeMind,

    downloadLlamaData:
        downloadLlamaData,

    trainDataset:
        trainDataset,

    learn:
        learn,

    recall:
        recall,

    getTrainingStats:
        getTrainingStats,

    exportDataset:
        exportDataset,

    downloadWeights:
        downloadWeights,

    importWeights:
        importWeights,

    clearTraining:
        clearTraining,

    resetTraining:
        resetTraining
};


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default trainer;