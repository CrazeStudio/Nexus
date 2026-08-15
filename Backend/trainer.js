/*
============================================================
CrazeMind Trainer
Brand: CrazeStudio
============================================================

Commands:

/train 100
/train 500
/train 1000

/train full
/train all
/train 0

Dataset:
    togethercomputer/llama-instruct

Storage:
    IndexedDB

IMPORTANT:
This is dataset retrieval/learning.
It does NOT perform neural-network weight
fine-tuning of Llama.
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

const HF_ROWS_API =
    "https://datasets-server.huggingface.co/rows";

const PAGE_SIZE =
    100;

const MAX_NORMAL_TRAIN =
    2000;

const DB_NAME =
    "CrazeMindDB";

const DB_VERSION =
    4;

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
                typeof indexedDB ===
                "undefined"
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
                                    keyPath:
                                        "id"
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
                                unique:
                                    false
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
                                unique:
                                    false
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
   SAVE ONE PAGE
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
                    const example
                    of examples
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


                    /*
                        Keep records small and safe.
                    */

                    const record = {

                        id:
                            String(id),

                        input:
                            String(input),

                        output:
                            String(output),

                        source:
                            String(
                                example.source ||
                                DATASET
                            ),

                        trainedAt:
                            Date.now()
                    };


                    store.put(
                        record
                    );


                    saved++;
                }

            } catch (error) {

                try {
                    db.close();
                } catch {}


                reject(
                    new Error(
                        `Failed to save training page: ${
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
   FETCH HUGGING FACE ROWS
============================================================ */

async function fetchRows(
    offset,
    length
) {

    const url =
        new URL(
            HF_ROWS_API
        );


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
        String(offset)
    );


    url.searchParams.set(
        "length",
        String(
            Math.min(
                PAGE_SIZE,
                length
            )
        )
    );


    let response;


    try {

        response =
            await fetch(
                url.toString(),
                {
                    method:
                        "GET",

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

    } catch (error) {

        throw new Error(
            `Network error while contacting Hugging Face: ${
                error?.message ||
                String(error)
            }`
        );
    }


    if (
        !response.ok
    ) {

        let detail = "";


        try {

            const error =
                await response.json();


            detail =
                error?.error ||
                error?.message ||
                "";

        } catch {
            // Response was not JSON.
        }


        throw new Error(
            `Hugging Face request failed: ${response.status}` +
            (
                detail
                    ? ` — ${detail}`
                    : ""
            )
        );
    }


    let data;


    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            `Hugging Face returned invalid JSON: ${
                error?.message ||
                String(error)
            }`
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


    /*
        Standard Llama format:

        [INST] question [/INST] answer
    */

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

                input,

                output,

                source:
                    DATASET
            });
        }
    }


    /*
        Fallback.
    */

    if (
        results.length === 0
    ) {

        const start =
            clean.indexOf(
                "[INST]"
            );


        const end =
            clean.indexOf(
                "[/INST]"
            );


        if (
            start !== -1 &&
            end !== -1 &&
            end > start
        ) {

            const input =
                clean
                    .slice(
                        start + 6,
                        end
                    )
                    .trim();


            const output =
                clean
                    .slice(
                        end + 7
                    )
                    .trim();


            if (
                input &&
                output
            ) {

                results.push({

                    input,

                    output,

                    source:
                        DATASET
                });
            }
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
        typeof row.text ===
        "string"
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
                String(
                    input
                ),

            output:
                String(
                    output
                ),

            source:
                DATASET
        }];
    }


    return [];
}


/* ============================================================
   DOWNLOAD DATASET
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

        requested =
            20;
    }


    requested =
        Math.floor(
            requested
        );


    /*
        0 = full dataset.
    */

    const wholeDataset =
        requested === 0;


    if (
        requested < 0
    ) {

        throw new Error(
            "Training amount cannot be negative."
        );
    }


    if (
        !wholeDataset
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


    /*
        Allow resuming from an offset.
    */

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
        wholeDataset ||
        rowsProcessed < requested
    ) {

        const remaining =
            wholeDataset
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
                    wholeDataset
                        ? null
                        : requested,

                percent:
                    wholeDataset
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
                    wholeDataset
                        ? `Downloading row ${offset}...`
                        : `Downloading ${rowsProcessed}/${requested}...`
            });
        }


        /*
            Download one page.
        */

        const data =
            await fetchRows(
                offset,
                pageLength
            );


        const rows =
            Array.isArray(
                data?.rows
            )
                ? data.rows
                : [];


        /*
            Dataset finished.
        */

        if (
            rows.length === 0
        ) {

            break;
        }


        /*
            Parse.
        */

        const examples =
            [];


        for (
            const row
            of rows
        ) {

            try {

                const parsed =
                    parseRow(
                        row
                    );


                if (
                    parsed.length
                ) {

                    examples.push(
                        ...parsed
                    );
                }

            } catch (error) {

                console.warn(
                    "Could not parse row:",
                    error
                );
            }
        }


        /*
            SAVE ONLY THIS PAGE.

            This prevents one huge IndexedDB
            transaction.
        */

        if (
            examples.length
        ) {

            try {

                const saved =
                    await storeExamples(
                        examples
                    );


                examplesSaved +=
                    saved;

            } catch (error) {

                throw new Error(
                    `Training stopped at dataset row ${offset}: ${
                        error?.message ||
                        String(error)
                    }`
                );
            }
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
                    wholeDataset
                        ? null
                        : requested,

                percent:
                    wholeDataset
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
                    wholeDataset
                        ? `Learned ${examplesSaved} examples — ${rowsProcessed} rows processed`
                        : `Learned ${examplesSaved} examples`
            });
        }


        /*
            Normal training finished.
        */

        if (
            !wholeDataset &&
            rowsProcessed >= requested
        ) {

            break;
        }


        /*
            Short page means end.
        */

        if (
            rows.length <
            pageLength
        ) {

            break;
        }


        /*
            Give the browser time to breathe.
        */

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
            "Hugging Face returned data, but no usable training examples were found."
        );
    }


    if (onProgress) {

        onProgress({

            phase:
                "complete",

            current:
                rowsProcessed,

            total:
                wholeDataset
                    ? rowsProcessed
                    : requested,

            percent:
                100,

            examples:
                examplesSaved,

            message:
                wholeDataset
                    ? `Full training complete: ${examplesSaved} examples`
                    : `Training complete: ${examplesSaved} examples`
        });
    }


    return {

        rows:
            rowsProcessed,

        examples:
            examplesSaved,

        targetRows:
            wholeDataset
                ? rowsProcessed
                : requested,

        dataset:
            DATASET,

        config:
            DATASET_CONFIG,

        split:
            DATASET_SPLIT,

        wholeDataset
    };
}


/* ============================================================
   MAIN TRAINER
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


    /*
        Save built-in knowledge.
    */

    const builtIn =
        await storeExamples(
            builtInExamples
        );


    /*
        Download dataset.
    */

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
   LEARN ONE
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
   STATISTICS
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
   EXPORT DATA
============================================================ */

export async function exportDataset() {

    const db =
        await openDatabase();


    const data =
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
                                request.error?.message ||
                                "Export failed."
                            )
                        );
                    };
            }
        );


    db.close();


    return data;
}


/* ============================================================
   DOWNLOAD TRAINING FILE
============================================================ */

export async function downloadWeights() {

    const examples =
        await exportDataset();


    const data = {

        format:
            "CrazeMind-Training-v6",

        brand:
            "CrazeStudio",

        model:
            "CrazeMind",

        dataset:
            DATASET,

        createdAt:
            new Date().toISOString(),

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
            "No file selected."
        );
    }


    const text =
        await file.text();


    const data =
        JSON.parse(
            text
        );


    if (
        !data ||
        !Array.isArray(
            data.examples
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
   CUSTOM TRAINING
============================================================ */

export async function trainDataset(
    dataset,
    options = {}
) {

    if (
        !Array.isArray(
            dataset
        )
    ) {

        throw new TypeError(
            "Dataset must be an array."
        );
    }


    let saved = 0;


    /*
        Save in small batches instead of
        one giant transaction.
    */

    const BATCH =
        100;


    for (
        let i = 0;
        i < dataset.length;
        i += BATCH
    ) {

        const batch =
            dataset.slice(
                i,
                i + BATCH
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
            cleaned.length
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
                        i + BATCH,
                        dataset.length
                    ),

                total:
                    dataset.length,

                percent:
                    Math.round(
                        (
                            Math.min(
                                i + BATCH,
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
   RESET
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

    trainCrazeMind,

    trainFromLlama:
        trainCrazeMind,

    downloadLlamaData,

    trainDataset,

    learn,

    recall,

    getTrainingStats,

    exportDataset,

    downloadWeights,

    importWeights,

    clearTraining,

    resetTraining
};


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default trainer;