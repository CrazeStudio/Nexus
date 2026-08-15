/*
============================================================
CrazeMind Trainer
Brand: CrazeStudio
============================================================

Commands:

/train 100
    -> Train 100 dataset rows

/train 500
    -> Train 500 dataset rows

/train 0
    -> Train the WHOLE available dataset

This trainer:

- Uses Hugging Face
- Uses togethercomputer/llama-instruct
- Automatically finds the dataset config
- Automatically finds the train split
- Downloads 100 rows at a time
- Stores data in IndexedDB
- Survives page refreshes
- Supports progress callbacks
- Supports custom learning
- Supports importing/exporting
- Provides recall()
- Provides downloadWeights()

IMPORTANT:

This is dataset learning/retrieval.

It does NOT fine-tune the neural weights of a
7B/13B/70B Llama model inside a browser.
*/


/* ============================================================
   CONFIG
============================================================ */

const DATASET =
    "togethercomputer/llama-instruct";

const HF_API =
    "https://datasets-server.huggingface.co";

const DB_NAME =
    "CrazeMindDB";

const DB_VERSION =
    2;

const STORE_NAME =
    "training";


/*
    Hugging Face Dataset Viewer allows
    up to 100 rows per /rows request.
*/

const PAGE_SIZE = 100;


/*
    Maximum for normal /train N.

    /train 0 is special and means
    the entire dataset.
*/

const MAX_NORMAL_TRAIN = 2000;


/* ============================================================
   BUILT-IN KNOWLEDGE
============================================================ */

const builtInExamples = [

    {
        input:
            "what is ai",

        output:
            "## Artificial Intelligence\n\n" +
            "Artificial intelligence (AI) is technology " +
            "that allows computers to perform tasks " +
            "that normally require human intelligence."
    },


    {
        input:
            "what is artificial intelligence",

        output:
            "## Artificial Intelligence\n\n" +
            "AI is the field of creating computer systems " +
            "that can perform tasks such as reasoning, " +
            "learning, perception, and language processing."
    },


    {
        input:
            "who created you",

        output:
            "## CrazeMind\n\n" +
            "I am **CrazeMind**, an AI created by **CrazeStudio**."
    },


    {
        input:
            "who made you",

        output:
            "I am **CrazeMind**, created by **CrazeStudio**."
    },


    {
        input:
            "what is crazemind",

        output:
            "## CrazeMind\n\n" +
            "CrazeMind is an AI project created by **CrazeStudio**."
    },


    {
        input:
            "what is javascript",

        output:
            "## JavaScript\n\n" +
            "JavaScript is a programming language commonly " +
            "used to create interactive websites and web applications."
    },


    {
        input:
            "what is html",

        output:
            "## HTML\n\n" +
            "HTML stands for **HyperText Markup Language**. " +
            "It provides the structure of web pages."
    },


    {
        input:
            "what is css",

        output:
            "## CSS\n\n" +
            "CSS stands for **Cascading Style Sheets**. " +
            "It controls the appearance and layout of web pages."
    },


    {
        input:
            "what is python",

        output:
            "## Python\n\n" +
            "Python is a high-level programming language " +
            "known for its readable syntax."
    },


    {
        input:
            "hello",

        output:
            "Hello! I'm **CrazeMind**, created by **CrazeStudio**."
    },


    {
        input:
            "hi",

        output:
            "Hi! I'm **CrazeMind**. How can I help?"
    },


    {
        input:
            "hey",

        output:
            "Hey! I'm **CrazeMind**. What can I help you with?"
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
   OPEN INDEXEDDB
============================================================ */

function openDatabase() {

    return new Promise(
        (resolve, reject) => {

            if (
                !("indexedDB" in window)
            ) {

                reject(
                    new Error(
                        "IndexedDB is not available in this browser."
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


                    if (
                        !db.objectStoreNames
                            .contains(
                                STORE_NAME
                            )
                    ) {

                        const store =
                            db.createObjectStore(
                                STORE_NAME,
                                {
                                    keyPath:
                                        "id"
                                }
                            );


                        store.createIndex(
                            "input",
                            "input",
                            {
                                unique: false
                            }
                        );


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
                        request.error
                    );
                };
        }
    );
}


/* ============================================================
   STORE MANY EXAMPLES
============================================================ */

async function storeExamples(
    examples,
    onProgress
) {

    if (
        !Array.isArray(examples) ||
        !examples.length
    ) {

        return 0;
    }


    const db =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            let saved = 0;


            for (
                let i = 0;
                i < examples.length;
                i++
            ) {

                const example =
                    examples[i];


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

                    id,

                    input,

                    output,

                    source:
                        example.source ||
                        "unknown",

                    trainedAt:
                        Date.now()
                });


                saved++;
            }


            transaction.oncomplete =
                () => {

                    db.close();

                    if (
                        typeof onProgress ===
                        "function"
                    ) {

                        onProgress(
                            saved,
                            examples.length
                        );
                    }


                    resolve(
                        saved
                    );
                };


            transaction.onerror =
                () => {

                    db.close();

                    reject(
                        transaction.error
                    );
                };
        }
    );
}


/* ============================================================
   GET HUGGING FACE DATASET CONFIG
============================================================ */

/*
    IMPORTANT:

    We DON'T use:

        config=default

    blindly.

    We first ask Hugging Face what configs
    and splits actually exist.
*/

export async function getDatasetConfig() {

    const url =
        new URL(
            `${HF_API}/splits`
        );


    url.searchParams.set(
        "dataset",
        DATASET
    );


    const response =
        await fetch(
            url.toString()
        );


    if (
        !response.ok
    ) {

        let message =
            "";


        try {

            const error =
                await response.json();


            message =
                error?.error ||
                "";

        } catch {
            // Ignore.
        }


        throw new Error(
            `Hugging Face dataset configuration failed ` +
            `(${response.status})` +
            (
                message
                    ? `: ${message}`
                    : ""
            )
        );
    }


    const data =
        await response.json();


    const splits =
        Array.isArray(
            data.splits
        )
            ? data.splits
            : [];


    if (
        !splits.length
    ) {

        throw new Error(
            "Hugging Face returned no dataset splits."
        );
    }


    /*
        Prefer the train split.
    */

    const selected =
        splits.find(
            item =>
                item.split ===
                "train"
        ) ||
        splits[0];


    return {

        config:
            selected.config,

        split:
            selected.split,

        rows:
            Number(
                selected.num_examples
            ) || 0,

        bytes:
            Number(
                selected.num_bytes
            ) || 0
    };
}


/* ============================================================
   FETCH ONE PAGE
============================================================ */

async function fetchRows(
    config,
    split,
    offset,
    length
) {

    const url =
        new URL(
            `${HF_API}/rows`
        );


    url.searchParams.set(
        "dataset",
        DATASET
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
        String(
            Math.min(
                length,
                PAGE_SIZE
            )
        )
    );


    const response =
        await fetch(
            url.toString()
        );


    if (
        !response.ok
    ) {

        let detail =
            "";


        try {

            const error =
                await response.json();


            detail =
                error?.error ||
                "";

        } catch {
            // Ignore.
        }


        throw new Error(
            `Hugging Face rows request failed ` +
            `(${response.status})` +
            (
                detail
                    ? `: ${detail}`
                    : ""
            )
        );
    }


    return await response.json();
}


/* ============================================================
   PARSE LLAMA-INSTRUCT TEXT
============================================================ */

function parseLlamaText(
    text
) {

    if (!text) {

        return [];
    }


    const results = [];


    const clean =
        String(
            text
        ).trim();


    /*
        Standard Llama-Instruct style:

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
        Fallback for rows where only one
        instruction block is found.
    */

    if (
        !results.length
    ) {

        const instruction =
            clean.match(
                /\[INST\]\s*([\s\S]*?)\s*\[\/INST\]/i
            );


        if (
            instruction
        ) {

            const input =
                instruction[1]
                    .trim();


            const output =
                clean
                    .slice(
                        instruction[0].length
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
   PARSE HUGGING FACE ROW
============================================================ */

function parseRow(
    row
) {

    if (!row) {

        return [];
    }


    const value =
        row.row;


    /*
        Normal format:
        { row: { text: "..." } }
    */

    if (
        value &&
        typeof value.text ===
        "string"
    ) {

        return parseLlamaText(
            value.text
        );
    }


    /*
        Some datasets expose the
        row directly as a string.
    */

    if (
        typeof value ===
        "string"
    ) {

        return parseLlamaText(
            value
        );
    }


    /*
        Generic fallback.
    */

    if (
        value &&
        typeof value ===
        "object"
    ) {

        const input =
            value.prompt ||
            value.instruction ||
            value.question;


        const output =
            value.response ||
            value.output ||
            value.answer;


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


    /*
        SPECIAL COMMAND:

        0 = WHOLE DATASET
    */

    const wholeDataset =
        requested === 0;


    /*
        Negative values are invalid.
    */

    if (
        requested < 0
    ) {

        throw new Error(
            "Training amount cannot be negative."
        );
    }


    /*
        Normal training limit.
    */

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


    /* --------------------------------------------------------
       FIND DATASET CONFIG
    -------------------------------------------------------- */

    if (onProgress) {

        onProgress({

            phase:
                "checking",

            current:
                0,

            total:
                wholeDataset
                    ? 0
                    : requested,

            percent:
                0,

            message:
                "Checking Llama-Instruct dataset…"
        });
    }


    const config =
        await getDatasetConfig();


    /*
        For /train 0, use the actual
        number of dataset rows.
    */

    const targetRows =
        wholeDataset
            ? config.rows
            : requested;


    if (
        !targetRows ||
        targetRows < 1
    ) {

        throw new Error(
            "Hugging Face did not return a valid " +
            "training dataset size."
        );
    }


    if (onProgress) {

        onProgress({

            phase:
                "ready",

            current:
                0,

            total:
                targetRows,

            percent:
                0,

            message:
                wholeDataset
                    ? `Whole dataset: ${targetRows} rows`
                    : `${targetRows} rows selected`
        });
    }


    /*
        We don't keep the entire dataset in RAM.

        Instead:

        Download page
             ↓
        Parse page
             ↓
        Save page
             ↓
        Continue
    */

    let offset =
        Math.max(
            0,
            Number(
                options.offset || 0
            )
        );


    let rowsProcessed =
        0;


    let examplesSaved =
        0;


    /*
        Start / resume until all rows are done.
    */

    while (
        rowsProcessed <
        targetRows
    ) {

        const remaining =
            targetRows -
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
                    targetRows,

                percent:
                    Math.round(
                        (
                            rowsProcessed /
                            targetRows
                        ) *
                        100
                    ),

                message:
                    `Downloading ${rowsProcessed}/${targetRows} rows…`
            });
        }


        /*
            Download one page.
        */

        const data =
            await fetchRows(
                config.config,
                config.split,
                offset,
                pageLength
            );


        const rows =
            Array.isArray(
                data.rows
            )
                ? data.rows
                : [];


        /*
            Dataset ended.
        */

        if (
            !rows.length
        ) {

            break;
        }


        /*
            Convert this page into
            instruction/answer examples.
        */

        const pageExamples =
            [];


        for (
            const row of rows
        ) {

            const parsed =
                parseRow(
                    row
                );


            pageExamples.push(
                ...parsed
            );
        }


        /*
            Immediately save this page.

            This is important for a phone:
            if the browser crashes halfway through
            a 19k-row training run, previously saved
            pages remain in IndexedDB.
        */

        if (
            pageExamples.length
        ) {

            const saved =
                await storeExamples(
                    pageExamples
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
                    targetRows,

                percent:
                    Math.round(
                        (
                            rowsProcessed /
                            targetRows
                        ) *
                        100
                    ),

                examples:
                    examplesSaved,

                message:
                    `Learned ${rowsProcessed}/${targetRows} dataset rows`
            });
        }


        /*
            Protect the UI.
        */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    0
                )
        );


        /*
            If the server returns fewer rows
            than requested, we reached the end.
        */

        if (
            rows.length <
            pageLength
        ) {

            break;
        }
    }


    if (onProgress) {

        onProgress({

            phase:
                "complete",

            current:
                rowsProcessed,

            total:
                targetRows,

            percent:
                100,

            examples:
                examplesSaved,

            message:
                `Training complete: ${examplesSaved} examples learned.`
        });
    }


    return {

        rows:
            rowsProcessed,

        examples:
            examplesSaved,

        targetRows,

        config:
            config.config,

        split:
            config.split,

        dataset:
            DATASET,

        wholeDataset
    };
}


/* ============================================================
   TRAIN CRAZEMIND
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


    /*
        Install built-in knowledge first.
    */

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

            message:
                "Initializing CrazeMind…"
        });
    }


    const builtInSaved =
        await storeExamples(
            builtInExamples
        );


    /*
        Download + learn Llama data.
    */

    const llama =
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
            llama.wholeDataset,

        datasetRows:
            llama.rows,

        trainedExamples:
            llama.examples,

        builtIn:
            builtInSaved,

        dataset:
            DATASET,

        config:
            llama.config,

        split:
            llama.split,

        mode:
            "llama-instruct-retrieval"
    };
}


/* ============================================================
   LEARN ONE EXAMPLE
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


    return await storeExamples([
        {

            input:
                String(
                    input
                ),

            output:
                String(
                    output
                ),

            source:
                "user"
        }
    ]);
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


    try {

        const db =
            await openDatabase();


        return await new Promise(
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


                /*
                    First try exact match.
                */

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

    } catch (error) {

        console.error(
            "CrazeMind recall:",
            error
        );


        return null;
    }
}


/* ============================================================
   GET ALL KNOWLEDGE
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
                            request.error
                        );
                    };
            }
        );


    db.close();


    return data.map(
        item => ({

            input:
                item.input,

            output:
                item.output,

            source:
                item.source,

            trainedAt:
                item.trainedAt
        })
    );
}


/* ============================================================
   TRAIN CUSTOM DATASET
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


    const cleaned =
        dataset
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


    const saved =
        await storeExamples(
            cleaned,

            (
                current,
                total
            ) => {

                if (
                    typeof options.onProgress ===
                    "function"
                ) {

                    options.onProgress({

                        phase:
                            "training",

                        current,

                        total,

                        percent:
                            total
                                ? Math.round(
                                    (
                                        current /
                                        total
                                    ) *
                                    100
                                )
                                : 100,

                        message:
                            `Learning ${current}/${total}…`
                    });
                }
            }
        );


    return {

        trained:
            saved,

        total:
            cleaned.length,

        source:
            "custom"
    };
}


/* ============================================================
   TRAINING STATS
============================================================ */

export async function getTrainingStats() {

    const db =
        await openDatabase();


    return await new Promise(
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
   DOWNLOAD LEARNED DATA
============================================================ */

export async function downloadWeights() {

    const examples =
        await exportDataset();


    const payload = {

        format:
            "CrazeMind-Training-v4",

        brand:
            "CrazeStudio",

        model:
            "CrazeMind",

        dataset:
            DATASET,

        createdAt:
            Date.now(),

        examples
    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    payload,
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
   IMPORT TRAINING
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


    return await trainDataset(
        data.examples
    );
}


/* ============================================================
   CLEAR TRAINING
============================================================ */

export async function clearTraining() {

    const db =
        await openDatabase();


    return await new Promise(
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


    return await trainCrazeMind(
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

    getDatasetConfig,

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